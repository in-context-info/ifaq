/**
 * React Query hook for managing FAQs
 * Provides automatic caching, refetching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFAQsByUserId,
  createFAQEntry,
  updateFAQEntry,
  deleteFAQEntry,
  getFAQWorkflowStatus,
} from '../api/client/faqService';
import type { FAQ } from '../api/types';
import { toast } from 'sonner';

/**
 * Wait for workflow to complete
 * First waits 1 second for workflow to start, then polls status
 */
async function waitForWorkflowCompletion(workflowId: string, maxAttempts = 30): Promise<void> {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Wait 1 second first to give the workflow time to start
  await delay(1000);

  // Now poll for completion
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await getFAQWorkflowStatus(workflowId);
      
      // Check various possible status locations in the response
      const state =
        status?.status ||
        status?.state ||
        status?.current?.status ||
        status?.result?.status ||
        status?.result?.state ||
        status?.output?.status;

      // Check for completion states
      if (state === 'completed' || state === 'success' || state === 'succeeded' || state === 'done') {
        console.log('Workflow completed successfully');
        return;
      }

      // Check for failure states
      if (state === 'failed' || state === 'error' || state === 'cancelled' || state === 'rejected') {
        throw new Error(`FAQ workflow failed with state: ${state}`);
      }

      // If status is pending/running, continue polling
      console.log(`Workflow status: ${state || 'unknown'}, attempt ${attempt + 1}/${maxAttempts}`);
      
      // Wait before next attempt
      await delay(1000);
    } catch (error) {
      // If it's a 404, workflow might not be found yet (still starting)
      if (error instanceof Error && error.message.includes('404') && attempt < 5) {
        console.log('Workflow not found yet, waiting...');
        await delay(1000);
        continue;
      }
      
      // If we can't get status after several attempts, log but don't fail
      // The FAQ is already in the DB, so we'll let refetch handle it
      if (attempt === maxAttempts - 1) {
        console.warn('Could not verify workflow status after all attempts, but FAQ may already be created:', error);
        return; // Don't throw - let the refetch handle it
      }
      
      // For other errors, wait and retry
      await delay(1000);
    }
  }

  // Timeout - but don't fail the mutation since FAQ is in DB
  console.warn(`Workflow status check timeout after ${maxAttempts} attempts, but FAQ may already be created`);
}

export function useFAQs(userId: string | number | undefined) {
  const queryClient = useQueryClient();

  // Fetch FAQs
  const {
    data: faqs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['faqs', userId],
    queryFn: () => fetchFAQsByUserId(userId!),
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Create FAQ mutation
  const createMutation = useMutation({
    mutationFn: async ({ question, answer }: { question: string; answer: string }) => {
      if (!userId) throw new Error('User ID is required');
      
      const response = await createFAQEntry(userId, question, answer);
      
      // Wait for workflow to complete (waits 1 second first, then polls)
      if (response.workflowId) {
        await waitForWorkflowCompletion(response.workflowId);
      }
      
      return response;
    },
    onMutate: async (newFAQ) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['faqs', userId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<FAQ[]>(['faqs', userId]);

      // Optimistically update
      const optimisticFAQ: FAQ = {
        id: `temp-${Date.now()}`,
        question: newFAQ.question,
        answer: newFAQ.answer,
      };
      queryClient.setQueryData<FAQ[]>(['faqs', userId], (old = []) => [...old, optimisticFAQ]);

      return { previous };
    },
    onError: (err, newFAQ, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['faqs', userId], context.previous);
      }
      toast.error('Failed to create FAQ');
    },
    onSuccess: () => {
      toast.success('FAQ created successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to get real data
      queryClient.invalidateQueries({ queryKey: ['faqs', userId] });
    },
  });

  // Update FAQ mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, question, answer }: { id: string; question: string; answer: string }) => {
      if (!userId) throw new Error('User ID is required');
      return updateFAQEntry(id, userId, question, answer);
    },
    onMutate: async ({ id, question, answer }) => {
      await queryClient.cancelQueries({ queryKey: ['faqs', userId] });

      const previous = queryClient.getQueryData<FAQ[]>(['faqs', userId]);

      // Optimistically update
      queryClient.setQueryData<FAQ[]>(['faqs', userId], (old = []) =>
        old.map((faq) => (faq.id === id ? { ...faq, question, answer } : faq))
      );

      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['faqs', userId], context.previous);
      }
      toast.error('Failed to update FAQ');
    },
    onSuccess: () => {
      toast.success('FAQ updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs', userId] });
    },
  });

  // Delete FAQ mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User ID is required');
      return deleteFAQEntry(id, userId);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['faqs', userId] });

      const previous = queryClient.getQueryData<FAQ[]>(['faqs', userId]);

      // Optimistically remove
      queryClient.setQueryData<FAQ[]>(['faqs', userId], (old = []) =>
        old.filter((faq) => faq.id !== id)
      );

      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['faqs', userId], context.previous);
      }
      toast.error('Failed to delete FAQ');
    },
    onSuccess: () => {
      toast.success('FAQ deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs', userId] });
    },
  });

  return {
    faqs,
    isLoading,
    error,
    refetch,
    createFAQ: createMutation.mutate,
    updateFAQ: updateMutation.mutate,
    deleteFAQ: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingId: deleteMutation.isPending && deleteMutation.variables ? deleteMutation.variables : null,
  };
}

