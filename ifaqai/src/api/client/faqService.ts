import type { FAQ } from '../types';

export interface CreateFAQResponse {
  message: string;
  workflowId: string;
  status: string;
}

/**
 * Create a FAQ entry via the workflow-enabled API.
 * This triggers D1 insert + Vectorize upsert in the worker.
 */
export async function createFAQEntry(
  userId: string | number,
  question: string,
  answer: string
): Promise<CreateFAQResponse> {
  const response = await fetch('/api/faqs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, question, answer }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorBody.error || 'Failed to create FAQ');
  }

  return response.json() as Promise<CreateFAQResponse>;
}

/**
 * Fetch workflow status for a FAQ creation job.
 */
export async function getFAQWorkflowStatus(workflowId: string): Promise<any> {
  const response = await fetch(`/api/faqs/${workflowId}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorBody.error || 'Failed to fetch workflow status');
  }
  return response.json();
}

export async function updateFAQEntry(
  faqId: string,
  userId: string | number,
  question: string,
  answer: string
): Promise<FAQ> {
  const response = await fetch(`/api/faqs/${faqId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, question, answer }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorBody.error || 'Failed to update FAQ');
  }

  return response.json() as Promise<FAQ>;
}

export async function deleteFAQEntry(
  faqId: string,
  userId: string | number
): Promise<void> {
  const response = await fetch(`/api/faqs/${faqId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorBody.error || 'Failed to delete FAQ');
  }
}

