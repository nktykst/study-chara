'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getMe, getApiKeyStatus } from './api';
import type { User, ApiKeyStatus } from '@/types';

export function useCurrentUser() {
  const { getToken, isSignedIn } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    getMe(() => getToken())
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  return { user, loading };
}

export function useApiKeyStatus() {
  const { getToken, isSignedIn } = useAuth();
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    getApiKeyStatus(() => getToken())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  return { status, loading };
}
