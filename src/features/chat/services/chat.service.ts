import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ChatMessage = {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
  editedAt: string | null;
};

type ChatMessageRow = {
  id: string;
  room_id: string;
  author_id: string;
  message: string;
  created_at: string;
  edited_at: string | null;
  profiles: { first_name: string; last_name: string } | null;
};

export async function fetchRoomForStore(storeId: string): Promise<ServiceResult<string>> {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('store_id', storeId)
    .eq('type', 'General')
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'FETCH_ROOM_FAILED');
  }

  return { success: true, data: data.id };
}

export async function fetchMessages(roomId: string): Promise<ServiceResult<ChatMessage[]>> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(
      'id, room_id, author_id, message, created_at, edited_at, profiles(first_name, last_name)',
    )
    .eq('room_id', roomId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    return fromCaughtError(error, 'FETCH_MESSAGES_FAILED');
  }

  const rows = data as unknown as ChatMessageRow[];

  return {
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      authorId: row.author_id,
      authorName: row.profiles ? `${row.profiles.first_name} ${row.profiles.last_name}` : '',
      message: row.message,
      createdAt: row.created_at,
      editedAt: row.edited_at,
    })),
  };
}

export async function sendChatMessage(
  roomId: string,
  authorId: string,
  message: string,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('chat_messages').insert({
    room_id: roomId,
    author_id: authorId,
    message,
  });

  if (error) {
    return fromCaughtError(error, 'SEND_MESSAGE_FAILED');
  }

  return { success: true, data: null };
}
