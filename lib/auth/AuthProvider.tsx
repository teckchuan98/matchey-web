'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { onIdTokenChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';
import { setCurrentToken } from './tokenRef';
import {
  emailSessionGet,
  emailSessionLogout,
  subscribeEmailSession,
  type EmailSession,
} from './emailSession';
import { authCheck, type AuthCheckResponse } from '@/lib/api/auth';

export type AuthUser = {
  kind: 'firebase' | 'email';
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type AuthIdentity = {
  email: string | null;
  uid: string | null;
  kind: 'firebase' | 'email' | null;
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'verifying'; identity: AuthIdentity }
  | { status: 'error'; identity: AuthIdentity; message: string }
  | { status: 'denied'; identity: AuthIdentity; response: AuthCheckResponse }
  | { status: 'authenticated'; user: AuthUser };

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
  retryVerify: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  signOut: async () => {},
  retryVerify: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [emailSession, setEmailSession] = useState<EmailSession | null>(null);
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [verifyNonce, setVerifyNonce] = useState(0);

  const signOutAll = useCallback(async () => {
    const tasks: Promise<unknown>[] = [];
    if (isFirebaseConfigured() && getFirebaseAuth().currentUser) {
      tasks.push(firebaseSignOut(getFirebaseAuth()));
    }
    if (emailSessionGet()) {
      tasks.push(emailSessionLogout());
    }
    await Promise.allSettled(tasks);
    setCurrentToken(null);
    queryClient.removeQueries({ queryKey: ['auth', 'check'] });
  }, [queryClient]);

  useEffect(() => {
    setEmailSession(emailSessionGet());
    return subscribeEmailSession(() => setEmailSession(emailSessionGet()));
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.warn(
        '[fittel] Firebase web app not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_APP_ID in .env.local',
      );
      setFirebaseReady(true);
      return;
    }
    const auth = getFirebaseAuth();
    return onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setCurrentToken(token);
      }
      setFirebaseUser(user);
      setFirebaseReady(true);
    });
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setCurrentToken);
    } else if (emailSession) {
      setCurrentToken(emailSession.token);
    } else {
      setCurrentToken(null);
    }
  }, [firebaseUser, emailSession]);

  const activeCheckIdRef = useRef(0);

  useEffect(() => {
    if (!firebaseReady) {
      setState({ status: 'loading' });
      return;
    }
    if (!firebaseUser && !emailSession) {
      setState({ status: 'unauthenticated' });
      return;
    }

    const identity: AuthIdentity = firebaseUser
      ? { email: firebaseUser.email, uid: firebaseUser.uid, kind: 'firebase' }
      : { email: emailSession!.email, uid: `email:${emailSession!.email}`, kind: 'email' };

    setState({ status: 'verifying', identity });

    const checkId = ++activeCheckIdRef.current;

    authCheck()
      .then((result: AuthCheckResponse) => {
        if (checkId !== activeCheckIdRef.current) return;
        if (result.role === 'TRAINER') {
          queryClient.setQueryData(['auth', 'check'], result);
          setState({
            status: 'authenticated',
            user: firebaseUser
              ? {
                  kind: 'firebase',
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                }
              : {
                  kind: 'email',
                  uid: `email:${emailSession!.email}`,
                  email: emailSession!.email,
                  displayName: null,
                },
          });
          return;
        }
        // CLIENT or UNREGISTERED — surface the response, do NOT auto sign out.
        setState({ status: 'denied', identity, response: result });
      })
      .catch((err: unknown) => {
        if (checkId !== activeCheckIdRef.current) return;
        const message =
          err instanceof TypeError ||
          (err instanceof Error && /Failed to fetch|NetworkError/i.test(err.message))
            ? "Couldn't reach the backend to verify your account."
            : err instanceof Error
              ? err.message
              : 'Verification failed.';
        setState({ status: 'error', identity, message });
      });
  }, [firebaseReady, firebaseUser, emailSession, queryClient, verifyNonce]);

  const value: AuthContextValue = {
    ...state,
    signOut: signOutAll,
    retryVerify: () => setVerifyNonce((n) => n + 1),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
