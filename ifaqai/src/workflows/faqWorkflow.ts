/**
 * Workflow for creating FAQs with embeddings
 * Stores FAQ in D1 database and generates embeddings for Vectorize
 */

import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type { Env } from "../types/env";

export interface FAQWorkflowPayload {
  userId: number | string;
  question: string;
  answer: string;
}

export class FAQWorkflow extends WorkflowEntrypoint<Env, FAQWorkflowPayload> {
  async run(event: Readonly<WorkflowEvent<FAQWorkflowPayload>>, step: WorkflowStep) {
    const env = this.env;
    const { userId, question, answer } = event.payload;

    console.log('FAQWorkflow started:', { userId, question, answer });

    // Step 1: Create database record
    const record = await step.do(`create database record`, async () => {
      console.log('Creating database record...');
      const query = `
        INSERT INTO FAQs (user_id, question, answer) 
        VALUES (?, ?, ?)
      `;

      console.log('Executing query with params:', { userId, question, answer });
      const result = await env.DB.prepare(query).bind(userId, question, answer).run();
      
      console.log('Query result:', result);
      
      if (!result.success) {
        throw new Error(`Database insert failed: ${result.error || 'Unknown error'}`);
      }
      
      const { meta } = result;
      
      if (!meta.last_row_id) {
        throw new Error("Failed to create FAQ - no row ID returned");
      }

      console.log('FAQ created with ID:', meta.last_row_id);

      // Fetch the created record
      const selectQuery = `SELECT * FROM FAQs WHERE faq_id = ?`;
      const result = await env.DB.prepare(selectQuery).bind(meta.last_row_id).first();
      
      if (!result) {
        throw new Error("Failed to retrieve created FAQ");
      }
      
      console.log('Retrieved FAQ record:', result);
      return result as any;
    });

    // Step 2: Generate embedding from question and answer
    const embedding = await step.do(`generate embedding`, async () => {
      // Combine question and answer for better semantic search
      const text = `${question} ${answer}`;
      
      const embeddings = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: text,
      });
      
      const values = embeddings.data[0];
      if (!values) throw new Error("Failed to generate vector embedding");
      return values;
    });

    // Step 3: Insert vector into Vectorize
    await step.do(`insert vector`, async () => {
      return env.VECTOR_INDEX.upsert([
        {
          id: record.faq_id.toString(),
          values: embedding,
          metadata: {
            userId: userId.toString(),
            question: question,
            answer: answer,
          },
        },
      ]);
    });

    return {
      faqId: record.faq_id,
      userId: record.user_id,
      question: record.question,
      answer: record.answer,
    };
  }
}

