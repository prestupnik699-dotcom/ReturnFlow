import { createClient } from 'jsr:@supabase/supabase-js@2';

const PUSH_TITLES: Record<string, Record<string, string>> = {
  ru: {
    chat_message: 'Новое сообщение в чате',
    return_created: 'Добавлен новый возврат',
    reminder_due_tomorrow: 'Напоминание: завтра',
    reminder_due_today: 'Напоминание: сегодня',
  },
  en: {
    chat_message: 'New chat message',
    return_created: 'New return added',
    reminder_due_tomorrow: 'Reminder: tomorrow',
    reminder_due_today: 'Reminder: today',
  },
  ka: {
    chat_message: 'ახალი შეტყობინება ჩატში',
    return_created: 'დაემატა ახალი დაბრუნება',
    reminder_due_tomorrow: 'შეხსენება: ხვალ',
    reminder_due_today: 'შეხსენება: დღეს',
  },
};

const DEFAULT_LANGUAGE = 'ru';

Deno.serve(async (req) => {
  try {
    const { notification_id } = await req.json();

    if (!notification_id) {
      return new Response(JSON.stringify({ error: 'Missing notification_id' }), { status: 400 });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id, profile_id, body, type')
      .eq('id', notification_id)
      .single();

    if (notificationError || !notification) {
      return new Response(JSON.stringify({ error: 'Notification not found' }), { status: 404 });
    }

    // The recipient's own saved language preference, not the sender's —
    // a Georgian-speaking employee should see a Georgian title even if
    // whoever triggered the notification uses the app in Russian.
    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', notification.profile_id)
      .single();

    const language = profile?.language && PUSH_TITLES[profile.language] ? profile.language : DEFAULT_LANGUAGE;

    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('profile_id', notification.profile_id);

    if (tokensError) {
      return new Response(JSON.stringify({ error: tokensError.message }), { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      // Not an error — the recipient simply has no registered device yet.
      return new Response(JSON.stringify({ skipped: 'No push tokens for this profile' }), { status: 200 });
    }

    const title = PUSH_TITLES[language][notification.type] ?? 'ReturnFlow';

    const messages = tokens.map((row) => ({
      to: row.token,
      title,
      body: notification.body,
      sound: 'default',
      // Without an explicit high priority, Android is free to deliver
      // the notification silently into the tray without a heads-up
      // banner — this is the documented Expo/FCM behavior, not a bug on
      // our end that a client-side channel setting alone can fix.
      priority: 'high',
      channelId: 'default',
      data: { type: notification.type, notificationId: notification.id },
    }));

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();

    return new Response(JSON.stringify({ sent: messages.length, pushResult }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
    });
  }
});
