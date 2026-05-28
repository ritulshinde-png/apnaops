"use client";
import * as React from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import type { Issue, Comment } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function CommentsThread({ issue }: { issue: Issue }) {
  const user = useCurrentUser();
  const openComments = useAppStore((s) => s.openComments);
  const toggleComments = useAppStore((s) => s.toggleComments);
  const addCommentToIssue = useAppStore((s) => s.addCommentToIssue);
  const editComment = useAppStore((s) => s.editComment);
  const deleteComment = useAppStore((s) => s.deleteComment);
  const isOpen = !!openComments[issue.id];
  const count = issue.comments.length;
  const [text, setText] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");

  function send() {
    if (!text.trim()) return;
    addCommentToIssue(issue.id, text.trim());
    setText("");
  }
  function startEdit(c: Comment) { setEditingId(c.id); setEditText(c.text); }
  function saveEdit() {
    if (!editingId) return;
    if (!editText.trim()) { alert("Comment cannot be empty. Use Delete instead."); return; }
    editComment(issue.id, editingId, editText.trim());
    setEditingId(null);
  }
  function removeComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    deleteComment(issue.id, id);
  }

  return (
    <div className="border-t">
      <button onClick={() => toggleComments(issue.id)} className="flex items-center gap-2 px-5 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
        <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")} />
        <span className="font-medium">{count} comment{count === 1 ? "" : "s"}</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-4">
          {issue.comments.length > 0 && (
            <div className="flex flex-col gap-3 mb-3">
              {issue.comments.map((c) => {
                const isAuthor = c.userId === user?.id;
                const isAdmin = user?.accessLevel === "owner" || user?.accessLevel === "admin";
                const canDelete = isAuthor || isAdmin;
                const editing = editingId === c.id;
                return (
                  <div key={c.id} className="flex gap-2.5 items-start group">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-muted">{c.userName.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground leading-tight">
                        <div className="flex items-center gap-1.5"><b className="text-foreground text-[12.5px] font-semibold">{c.userName}</b><span>·</span><span>{c.ts}</span>{c.edited && <span>(edited)</span>}</div>
                        <div className="flex gap-0.5 shrink-0">
                          {isAuthor && <Button variant="ghost" size="icon" className="h-5 w-5 [&_svg]:size-3" onClick={() => startEdit(c)} title="Edit"><Pencil /></Button>}
                          {canDelete && <Button variant="ghost" size="icon" className="h-5 w-5 [&_svg]:size-3 hover:text-destructive" onClick={() => removeComment(c.id)} title="Delete"><Trash2 /></Button>}
                        </div>
                      </div>
                      {editing ? (
                        <div className="mt-1.5">
                          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="text-sm min-h-[60px]" />
                          <div className="flex justify-end gap-1 mt-1.5">
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button size="sm" onClick={saveEdit}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[13px] leading-snug text-foreground break-words" dangerouslySetInnerHTML={{ __html: c.text.replace(/@([A-Za-z][\w ]+?)(?=$|[,.;:!?\n])/g, '<span class="bg-primary/15 text-primary px-1 rounded font-medium">@$1</span>') }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-muted">{user?.name?.[0] || "?"}</AvatarFallback></Avatar>
            <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a comment… use @ to mention" className="flex-1 h-8 text-xs" />
            <Button size="sm" className="h-8" onClick={send} disabled={!text.trim()}>Send</Button>
          </div>
        </div>
      )}
    </div>
  );
}
