import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Plus, Edit2, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createFAQEntry } from '../api/client';

interface FAQ {
  question: string;
  answer: string;
  id: string;
}

interface FAQManagerProps {
  faqs: FAQ[];
  userId?: string | number;
  onUpdate: (faqs: FAQ[]) => void;
}

export function FAQManager({ faqs, userId, onUpdate }: FAQManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    try {
      setIsSubmitting(true);
      // Optimistically update UI
      onUpdate([...faqs, newFAQ]);
      await createFAQEntry(userId, newFAQ.question, newFAQ.answer);
      toast.success('FAQ submitted. Vectorization will finish shortly.');
      setQuestion('');
      setAnswer('');
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create FAQ:', error);
      const message = error instanceof Error ? error.message : 'Failed to create FAQ';
      toast.error(message);
      // Revert optimistic update
      onUpdate(faqs);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim() || !editingFAQ) {
      toast.error('Please fill in both question and answer');
      return;
    }

    const updatedFAQs = faqs.map(faq =>
      faq.id === editingFAQ.id
        ? { ...faq, question: question.trim(), answer: answer.trim() }
        : faq
    );

    onUpdate(updatedFAQs);
    setQuestion('');
    setAnswer('');
    setEditingFAQ(null);
    toast.success('FAQ updated successfully');
  };

  const handleDeleteFAQ = (id: string) => {
    const updatedFAQs = faqs.filter(faq => faq.id !== id);
    onUpdate(updatedFAQs);
    toast.success('FAQ deleted successfully');
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
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
            <Button onClick={() => setIsAddDialogOpen(true)}>
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
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFAQ(faq.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
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
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
