import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ReturnComment = {
  id: string;
  comment: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  pendingSync?: boolean;
};

type CommentRow = {
  id: string;
  comment: string;
  author_id: string;
  created_at: string;
  profiles: { first_name: string; last_name: string } | null;
};

export async function fetchReturnComments(
  returnItemId: string,
): Promise<ServiceResult<ReturnComment[]>> {
  const { data, error } = await supabase
    .from('return_comments')
    .select('id, comment, author_id, created_at, profiles(first_name, last_name)')
    .eq('return_item_id', returnItemId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    return fromCaughtError(error, 'FETCH_COMMENTS_FAILED');
  }

  const rows = data as unknown as CommentRow[];

  return {
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      comment: row.comment,
      authorId: row.author_id,
      authorName: row.profiles ? `${row.profiles.first_name} ${row.profiles.last_name}` : '',
      createdAt: row.created_at,
    })),
  };
}

export async function createReturnComment(
  returnItemId: string,
  authorId: string,
  comment: string,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('return_comments').insert({
    return_item_id: returnItemId,
    author_id: authorId,
    comment,
  });

  if (error) {
    return fromCaughtError(error, 'CREATE_COMMENT_FAILED');
  }

  return { success: true, data: null };
}
