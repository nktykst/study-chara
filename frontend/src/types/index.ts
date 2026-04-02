export interface User {
  id: string;
  clerk_user_id: string;
  display_name: string | null;
  ai_provider: string;
  created_at: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  persona: string | null;
  tone: string | null;
  catchphrase: string | null;
  created_at: string;
}

export interface CharacterCreate {
  name: string;
  persona?: string;
  tone?: string;
  catchphrase?: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  character_id: string | null;
  title: string;
  goal: string;
  start_date: string;
  end_date: string;
  ai_plan: string | null;
  created_at: string;
}

export interface StudyPlanDetail extends StudyPlan {
  tasks: Task[];
}

export interface StudyPlanCreate {
  character_id?: string;
  title: string;
  goal: string;
  start_date: string;
  end_date: string;
}

export interface Task {
  id: string;
  study_plan_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  order_index: number;
  created_at: string;
  is_completed: boolean;
  cheer_message: string | null;
}

export interface TaskCreate {
  title: string;
  description?: string;
  due_date?: string;
  order_index?: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  study_plan_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface ApiKeyStatus {
  provider: string;
  masked_key: string | null;
  is_set: boolean;
}

export interface TodayTask extends Task {
  study_plan_title: string;
  is_overdue: boolean;
}
