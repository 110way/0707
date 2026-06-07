'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Avatar, Card, CardBody } from '@/components/ui';
import { Paperclip, Send, Hash, Sparkles } from 'lucide-react';

interface PostEditorProps {
  onSubmit: (content: string, hashtags: string[], imageUrl?: string) => void;
  trendingHashtags: string[];
}

export const PostEditor: React.FC<PostEditorProps> = ({ onSubmit, trendingHashtags }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [showHashtagSuggest, setShowHashtagSuggest] = useState(false);
  const [hashtagSearch, setHashtagSearch] = useState('');
  const [suggestIndex, setSuggestIndex] = useState(0);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxChars = 1000;

  // Extract hashtags from content automatically
  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#[a-zA-Z0-9_]+/g);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  };

  // Watch for '#' typing to show suggestions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value.slice(0, maxChars);
    setContent(text);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, selectionStart);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('#') && lastWord.length > 1) {
      setShowHashtagSuggest(true);
      setHashtagSearch(lastWord.slice(1).toLowerCase());
      setSuggestIndex(0);
    } else if (lastWord === '#') {
      setShowHashtagSuggest(true);
      setHashtagSearch('');
      setSuggestIndex(0);
    } else {
      setShowHashtagSuggest(false);
    }
  };

  // Insert selected hashtag
  const selectHashtag = (tag: string) => {
    if (!editorRef.current) return;
    const text = content;
    const selectionStart = editorRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, selectionStart);
    const textAfterCursor = text.slice(selectionStart);
    
    const words = textBeforeCursor.split(/\s/);
    words[words.length - 1] = `#${tag} `; // Replace last typed hash word with full tag
    
    const newTextBefore = words.join(' ');
    setContent(newTextBefore + textAfterCursor);
    setShowHashtagSuggest(false);
    
    // Reset focus
    setTimeout(() => {
      editorRef.current?.focus();
      const newCursorPos = newTextBefore.length;
      editorRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const filteredHashtags = trendingHashtags
    .filter((tag) => tag.toLowerCase().includes(hashtagSearch))
    .slice(0, 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    const hashtags = extractHashtags(content);
    onSubmit(content, hashtags, imageUrl);
    setContent('');
    setImageUrl(undefined);
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.url) {
          setImageUrl(json.data.url);
        }
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to upload file');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Network error while uploading file');
    }
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-visible">
      <CardBody className="p-4 flex gap-3.5">
        <div className="shrink-0">
          <Avatar name={user?.name || 'User'} size="md" />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3 relative">
          <div className="relative">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleTextChange}
              rows={3}
              placeholder="Share an update, idea, or wellness tip..."
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/30 dark:focus:ring-primary-500/30 transition-all resize-none text-slate-800 dark:text-slate-200"
            />

            {/* Hashtag Suggestions Dropdown */}
            {showHashtagSuggest && filteredHashtags.length > 0 && (
              <div className="absolute left-0 bottom-full mb-1 z-30 w-48 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-lg p-1 max-h-40 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/50">
                  Hashtag Suggestions
                </div>
                {filteredHashtags.map((tag, idx) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => selectHashtag(tag)}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image preview */}
          {imageUrl && (
            <div className="relative inline-block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Attached" className="object-cover max-h-40 w-auto" />
              <button
                type="button"
                onClick={() => setImageUrl(undefined)}
                className="absolute top-1 right-1 bg-slate-900/60 text-white rounded-full p-1 hover:bg-slate-900 transition-colors"
                aria-label="Remove image"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Editor Action Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAttachmentClick}
                className="text-slate-500 hover:text-primary-600 rounded-lg p-1.5"
                title="Attach Image"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {content.length}/{maxChars}
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={!content.trim()}
                className="flex items-center gap-1 px-3.5 rounded-lg"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Post</span>
              </Button>
            </div>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};
