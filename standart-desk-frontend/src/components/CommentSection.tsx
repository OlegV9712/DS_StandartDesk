import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { User } from '../types';
import '../styles/comment-section.css';

export interface Comment {
  id: number;
  taskId: number;
  userId: number;
  userName: string;
  userAvatar: string;
  text: string;
  mentionedUserIds: string;
  createdAt: string;
  updatedAt?: string;
}

interface CommentSectionProps {
  taskId: number;
  users: User[];
  onCommentAdded?: (comment: Comment) => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  taskId,
  users,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTaskComments(taskId);
      setComments(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewCommentText(text);

    // Check for @mention
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = text.substring(lastAtIndex + 1);
      if (afterAt.length > 0 && !afterAt.includes(' ')) {
        const filtered = users.filter(u =>
          (u.fullName?.toLowerCase() || u.username.toLowerCase()).includes(afterAt.toLowerCase())
        );
        setFilteredUsers(filtered);
        setShowMentions(filtered.length > 0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: User) => {
    const lastAtIndex = newCommentText.lastIndexOf('@');
    const beforeAt = newCommentText.substring(0, lastAtIndex);
    const newText = `${beforeAt}@${user.username} `;
    setNewCommentText(newText);
    setShowMentions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCommentText.trim()) return;

    try {
      const response = await apiService.createTaskComment(taskId, {
        text: newCommentText.trim(),
      });

      const newComment: Comment = response.data;
      setComments([...comments, newComment]);
      setNewCommentText('');
      setError(null);
      onCommentAdded?.(newComment);
    } catch (err) {
      console.error('Failed to create comment:', err);
      setError('Failed to create comment');
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await apiService.deleteTaskComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError('Failed to delete comment');
    }
  };

  const renderCommentText = (text: string, mentions: string) => {
    if (!mentions) return text;

    let result = text;

    // Highlight @mentions
    const mentionRegex = /@(\w+)/g;
    result = text.replace(mentionRegex, (match) => {
      return `<span class="comment__mention">${match}</span>`;
    });

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  if (loading) return <div className="comment-section__loading">Loading comments...</div>;

  return (
    <section className="comment-section">
      <h3 className="comment-section__title">Comments ({comments.length})</h3>

      {error && <div className="comment-section__error">{error}</div>}

      {/* Comment List */}
      <div className="comment-section__list">
        {comments.length === 0 ? (
          <p className="comment-section__empty">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="comment-section__item">
              <div className="comment__header">
                <div className="comment__user">
                  <span className="comment__avatar">{comment.userAvatar}</span>
                  <div className="comment__user-info">
                    <p className="comment__userName">{comment.userName}</p>
                    <p className="comment__date">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  className="comment__delete-btn"
                  onClick={() => handleDelete(comment.id)}
                  title="Delete comment"
                >
                  ✕
                </button>
              </div>
              <div className="comment__text">
                {renderCommentText(comment.text, comment.mentionedUserIds)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="comment-section__form">
        <div className="comment-section__input-wrapper">
          <textarea
            className="comment-section__input"
            placeholder="Write a comment... (use @username to mention someone)"
            value={newCommentText}
            onChange={handleCommentChange}
            rows={3}
          />

          {/* @mention Popup */}
          {showMentions && filteredUsers.length > 0 && (
            <div className="comment-section__mentions-popup">
              {filteredUsers.slice(0, 5).map(user => (
                <button
                  key={user.id}
                  type="button"
                  className="comment-section__mention-item"
                  onClick={() => insertMention(user)}
                >
                  <span>{user.avatar || '👤'}</span>
                  <span>{user.fullName || user.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="comment-section__submit-btn" disabled={!newCommentText.trim()}>
          Add Comment
        </button>
      </form>
    </section>
  );
};
