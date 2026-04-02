import type {
  User,
  Character,
  CharacterCreate,
  StudyPlan,
  StudyPlanDetail,
  StudyPlanCreate,
  Task,
  TaskCreate,
  Conversation,
  ConversationDetail,
  ApiKeyStatus,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type GetToken = () => Promise<string | null>;

async function req<T>(
  path: string,
  getToken: GetToken,
  options?: RequestInit
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) {
    throw new Error(data?.detail ?? 'API request failed');
  }
  return data as T;
}

// Users
export const getMe = (gt: GetToken) => req<User>('/me', gt);
export const updateMe = (gt: GetToken, body: { display_name?: string }) =>
  req<User>('/me', gt, { method: 'PUT', body: JSON.stringify(body) });

// API Key
export const getApiKeyStatus = (gt: GetToken) =>
  req<ApiKeyStatus>('/me/api-key/status', gt);
export const updateApiKey = (gt: GetToken, provider: string, api_key: string) =>
  req<User>('/me/api-key', gt, {
    method: 'PUT',
    body: JSON.stringify({ provider, api_key }),
  });
export const deleteApiKey = (gt: GetToken) =>
  req<null>('/me/api-key', gt, { method: 'DELETE' });

// Characters
export const listCharacters = (gt: GetToken) =>
  req<Character[]>('/characters', gt);
export const createCharacter = (gt: GetToken, body: CharacterCreate) =>
  req<Character>('/characters', gt, {
    method: 'POST',
    body: JSON.stringify(body),
  });
export const updateCharacter = (
  gt: GetToken,
  id: string,
  body: Partial<CharacterCreate>
) =>
  req<Character>(`/characters/${id}`, gt, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
export const deleteCharacter = (gt: GetToken, id: string) =>
  req<null>(`/characters/${id}`, gt, { method: 'DELETE' });

// Study Plans
export const listStudyPlans = (gt: GetToken) =>
  req<StudyPlan[]>('/study-plans', gt);
export const createStudyPlan = (gt: GetToken, body: StudyPlanCreate) =>
  req<StudyPlan>('/study-plans', gt, {
    method: 'POST',
    body: JSON.stringify(body),
  });
export const getStudyPlan = (gt: GetToken, id: string) =>
  req<StudyPlanDetail>(`/study-plans/${id}`, gt);
export const deleteStudyPlan = (gt: GetToken, id: string) =>
  req<null>(`/study-plans/${id}`, gt, { method: 'DELETE' });

// Tasks
export const listTasks = (gt: GetToken, planId: string) =>
  req<Task[]>(`/study-plans/${planId}/tasks`, gt);
export const generateTasks = (gt: GetToken, planId: string) =>
  req<Task[]>(`/study-plans/${planId}/tasks/generate`, gt, { method: 'POST' });
export const createTask = (gt: GetToken, planId: string, body: TaskCreate) =>
  req<Task>(`/study-plans/${planId}/tasks`, gt, {
    method: 'POST',
    body: JSON.stringify(body),
  });
export const completeTask = (gt: GetToken, taskId: string) =>
  req<{ cheer_message: string | null }>(`/tasks/${taskId}/complete`, gt, {
    method: 'POST',
  });
export const uncompleteTask = (gt: GetToken, taskId: string) =>
  req<null>(`/tasks/${taskId}/complete`, gt, { method: 'DELETE' });
export const deleteTask = (gt: GetToken, taskId: string) =>
  req<null>(`/tasks/${taskId}`, gt, { method: 'DELETE' });

// Conversations
export const listConversations = (gt: GetToken, planId: string) =>
  req<Conversation[]>(`/study-plans/${planId}/conversations`, gt);
export const createConversation = (gt: GetToken, planId: string) =>
  req<Conversation>(`/study-plans/${planId}/conversations`, gt, {
    method: 'POST',
  });
export const getConversation = (gt: GetToken, convId: string) =>
  req<ConversationDetail>(`/conversations/${convId}/messages`, gt);
export const sendMessage = (
  gt: GetToken,
  convId: string,
  content: string
) =>
  req<ConversationDetail>(`/conversations/${convId}/messages`, gt, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
