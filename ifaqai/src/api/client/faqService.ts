import type { FAQ } from '../types';

/**
 * Fetch all FAQs for a user from the database
 */
export async function fetchFAQsFromDatabase(userId: string | number): Promise<FAQ[]> {
  // FAQs are included when fetching user data
  // We'll get them from the user endpoint
  const response = await fetch(`/api/users/me?email=${encodeURIComponent('')}&userId=${userId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch FAQs: ${response.statusText}`);
  }
  
  const user = await response.json();
  return user.faqs || [];
}

/**
 * Fetch FAQs directly from the database by user ID
 */
export async function fetchFAQsByUserId(userId: string | number): Promise<FAQ[]> {
  const response = await fetch(`/api/faqs?userId=${userId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorBody.error || `Failed to fetch FAQs: ${response.statusText}`);
  }
  
  return response.json() as Promise<FAQ[]>;
}

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

