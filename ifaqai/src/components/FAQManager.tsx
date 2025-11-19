import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Plus, Edit2, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { useFAQs } from '../hooks/useFAQs';
import type { FAQ } from '../api/types';

interface FAQManagerProps {
  userId?: string | number;
}

export function FAQManager({ userId }: FAQManagerProps) {
  const {
    faqs,
    isLoading,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    isCreating,
    isUpdating,
    isDeleting,
    deletingId,
    workflowStep,
  } = useFAQs(userId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const isBusy = isCreating || isUpdating || isDeleting;

  // Get status message based on workflow step
  const getStatusMessage = (): string => {
    if (!isCreating || !workflowStep) return 'Add FAQ';
    
    switch (workflowStep) {
      case 'starting':
        return 'Starting...';
      case 'creating-db-record':
        return 'Saving to database...';
      case 'generating-embedding':
        return 'Learning...';
      case 'inserting-vector':
        return 'Memorizing...';
      case 'completed':
        return 'Completed!';
      case 'failed':
        return 'Failed';
      default:
        return 'Creating...';
    }
  };

  const handleAddFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      return;
    }

    if (!userId && userId !== 0) {
      return;
    }

    createFAQ(
      { question: question.trim(), answer: answer.trim() },
      {
        onSuccess: () => {
          setQuestion('');
          setAnswer('');
          setIsAddDialogOpen(false);
        },
      }
    );
  };

  const handleEditFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim() || !editingFAQ) {
      return;
    }

    if (!userId && userId !== 0) {
      return;
    }

    updateFAQ(
      { id: editingFAQ.id, question: question.trim(), answer: answer.trim() },
      {
        onSuccess: () => {
          setQuestion('');
          setAnswer('');
          setEditingFAQ(null);
        },
      }
    );
  };

  const handleDeleteFAQ = (id: string) => {
    if (!userId && userId !== 0) {
      return;
    }

    deleteFAQ(id);
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading FAQs...</p>
        </CardContent>
      </Card>
    );
  }

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
              <DialogContent className="max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add New FAQ</DialogTitle>
                  <DialogDescription>
                    Create a question-answer pair to train your chatbot
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddFAQ} className="space-y-4 flex-1 overflow-y-auto pr-2">
                  <div className="space-y-2">
                    <Label htmlFor="question">Question</Label>
                    <Input
                      id="question"
                      placeholder="What is your question?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      required
                      disabled={isCreating}
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
                      className="min-h-[120px] max-h-[300px] overflow-y-auto resize-y"
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setQuestion('');
                        setAnswer('');
                      }}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {getStatusMessage()}
                        </>
                      ) : (
                        'Add FAQ'
                      )}
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
                      disabled={isBusy || deletingId === faq.id}
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
      <Dialog open={!!editingFAQ} onOpenChange={(open) => !open && !isBusy && closeEditDialog()}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>
              Update the question-answer pair
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditFAQ} className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-question">Question</Label>
              <Input
                id="edit-question"
                placeholder="What is your question?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                disabled={isUpdating}
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
                className="min-h-[120px] max-h-[300px] overflow-y-auto resize-y"
                required
                disabled={isUpdating}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
