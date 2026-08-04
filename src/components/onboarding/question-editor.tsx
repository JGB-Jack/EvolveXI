"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  updateTeamQuestion,
  deleteCustomQuestion,
} from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type TeamQuestionRow = {
  id: string;
  pillar_id: string;
  variant: string;
  order_index: number;
  question_text: string;
  anchor_1: string;
  anchor_2: string;
  anchor_3: string;
  anchor_4: string;
  anchor_5: string;
  is_custom: boolean;
};

export function QuestionEditor({ question }: { question: TeamQuestionRow }) {
  const [fields, setFields] = useState({
    question_text: question.question_text,
    anchor_1: question.anchor_1,
    anchor_2: question.anchor_2,
    anchor_3: question.anchor_3,
    anchor_4: question.anchor_4,
    anchor_5: question.anchor_5,
  });
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const dirty =
    fields.question_text !== question.question_text ||
    fields.anchor_1 !== question.anchor_1 ||
    fields.anchor_2 !== question.anchor_2 ||
    fields.anchor_3 !== question.anchor_3 ||
    fields.anchor_4 !== question.anchor_4 ||
    fields.anchor_5 !== question.anchor_5;

  function setField(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateTeamQuestion(question.id, fields);
      question.question_text = fields.question_text;
      question.anchor_1 = fields.anchor_1;
      question.anchor_2 = fields.anchor_2;
      question.anchor_3 = fields.anchor_3;
      question.anchor_4 = fields.anchor_4;
      question.anchor_5 = fields.anchor_5;
      toast.success("Question saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteCustomQuestion(question.id);
      setDeleted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setSaving(false);
    }
  }

  if (deleted) return null;

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <Textarea
            value={fields.question_text}
            onChange={(e) => setField("question_text", e.target.value)}
            className="min-h-14 flex-1 font-medium"
          />
          {question.is_custom && <Badge variant="secondary">Custom</Badge>}
        </div>
        <div className="grid gap-2 sm:grid-cols-5">
          {([1, 2, 3, 4, 5] as const).map((score) => (
            <div key={score} className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Score {score}
              </Label>
              <Textarea
                value={fields[`anchor_${score}` as keyof typeof fields]}
                onChange={(e) =>
                  setField(`anchor_${score}` as keyof typeof fields, e.target.value)
                }
                className="min-h-16 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          {question.is_custom && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={saving}
            >
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
