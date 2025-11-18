import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Plus, Edit2, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createFAQEntry, updateFAQEntry, deleteFAQEntry, getFAQWorkflowStatus } from '../api/client';
import type { FAQ } from '../api/types';

interface FAQManagerProps {
  faqs: FAQ[];
  userId?: string | number;
  onUpdate: (faqs: FAQ[]) => void;
  onRefresh?: () => Promise<void> | void;
}

export function FAQManager({ faqs, userId, onUpdate, onRefresh }: FAQManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isBusy = isSubmitting || isEditing || deletingId !== null;

  const waitForWorkflowCompletion = async (workflowId: string): Promise<void> => {
    const maxAttempts = 10;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await getFAQWorkflowStatus(workflowId).catch(() => null);
      const state =
        status?.status ||
        status?.state ||
        status?.result?.status ||
        status?.result?.state;

      if (state === 'completed' || state === 'success' || state === 'succeeded') {
        return;
      }

      if (state === 'failed' || state === 'error' || state === 'cancelled') {
        throw new Error('FAQ creation workflow failed');
      }

      await delay(1500);
    }

    throw new Error('FAQ creation is still processing. Please try again shortly.');
  };

  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      toast.error('Please fill in both question and answer');
      return;
    }

    if (!userId && userId !== 0) {
      toast.error('Missing user ID. Please ensure your profile is saved.');
      return;
    }

    const newFAQ: FAQ = {
      id: Date.now().toString(),
      question: question.trim(),
      answer: answer.trim(),
    };

    const previousFaqs = [...faqs];

    try {
      setIsSubmitting(true);
      // Optimistically update UI
      onUpdate([...faqs, newFAQ]);
      const { workflowId } = await createFAQEntry(userId, newFAQ.question, newFAQ.answer);
      if (workflowId) {
        await waitForWorkflowCompletion(workflowId);
      }
      await onRefresh?.();
      toast.success('FAQ submitted. Vectorization will finish shortly.');
      setQuestion('');
      setAnswer('');
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create FAQ:', error);
      const message = error instanceof Error ? error.message : 'Failed to create FAQ';
      toast.error(message);
      // Revert optimistic update
      onUpdate([...previousFaqs]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim() || !editingFAQ) {
      toast.error('Please fill in both question and answer');
      return;
    }

    if (!userId && userId !== 0) {
      toast.error('Missing user ID. Please ensure your profile is saved.');
      return;
    }

    const updatedFAQs = faqs.map((faq) =>
      faq.id === editingFAQ.id
        ? { ...faq, question: question.trim(), answer: answer.trim() }
        : faq
    );

    const previousFaqs = [...faqs];

    try {
      setIsEditing(true);
      onUpdate(updatedFAQs);
      await updateFAQEntry(editingFAQ.id, userId, question.trim(), answer.trim());
      await onRefresh?.();
      toast.success('FAQ updated successfully');
      setQuestion('');
      setAnswer('');
      setEditingFAQ(null);
    } catch (error) {
      console.error('Failed to update FAQ:', error);
      const message = error instanceof Error ? error.message : 'Failed to update FAQ';
      toast.error(message);
      // Revert to previous FAQs
      onUpdate([...previousFaqs]);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!userId && userId !== 0) {
      toast.error('Missing user ID. Please ensure your profile is saved.');
      return;
    }

    const updatedFAQs = faqs.filter((faq) => faq.id !== id);
    const previousFaqs = [...faqs];

    try {
      setDeletingId(id);
      onUpdate(updatedFAQs);
      await deleteFAQEntry(id, userId);
      await onRefresh?.();
      toast.success('FAQ deleted successfully');
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete FAQ';
      toast.error(message);
      onUpdate([...previousFaqs]);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (faq: FAQ) => {
    setEditingFAQ(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
  };

  const closeEditDialog = () => {
    setEditingFAQ(null);
    setQuestion('');
    setAnswer('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>FAQ Training Data</CardTitle>
              <CardDescription>
                Add question and answer pairs to train your AI chatbot
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => !isBusy && setIsAddDialogOpen(open)}>
              <DialogTrigger asChild>
                <Button disabled={isBusy}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New FAQ</DialogTitle>
                  <DialogDescription>
                    Create a question-answer pair to train your chatbot
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddFAQ} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question">Question</Label>
                    <Input
                      id="question"
                      placeholder="What is your question?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="answer">Answer</Label>
                    <Textarea
                      id="answer"
                      placeholder="Provide the answer..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      rows={5}
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setQuestion('');
                        setAnswer('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Add FAQ'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* FAQ List */}
      {faqs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No FAQs yet</h3>
            <p className="text-gray-600 mb-4">
              Start adding question-answer pairs to train your chatbot
            </p>
            <Button onClick={() => !isBusy && setIsAddDialogOpen(true)} disabled={isBusy}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First FAQ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <Card key={faq.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Question:</label>
                    <p>{faq.question}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Answer:</label>
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(faq)}
                      disabled={isBusy}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFAQ(faq.id)}
                      disabled={deletingId === faq.id}
                    >
                      {deletingId === faq.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingFAQ} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>
              Update the question-answer pair
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditFAQ} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-question">Question</Label>
              <Input
                id="edit-question"
                placeholder="What is your question?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-answer">Answer</Label>
              <Textarea
                id="edit-answer"
                placeholder="Provide the answer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
              >
                Cancel
              </Button>
                    <Button type="submit" disabled={isEditing}>
                      {isEditing ? 'Saving...' : 'Save Changes'}
                    </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
