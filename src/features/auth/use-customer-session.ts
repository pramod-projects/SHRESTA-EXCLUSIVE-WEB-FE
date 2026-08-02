"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCustomerSession,
  logoutCustomerSession,
  type CustomerSession
} from "@/features/auth/customer-session";

export function useCustomerSession() {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    void fetchCustomerSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCustomerSession()
      .then((profile) => {
        if (active) {
          setSession(profile);
        }
      })
      .catch(() => {
        if (active) {
          setSession(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(() => {
    void logoutCustomerSession().finally(() => setSession(null));
  }, []);

  return { isLoading, refresh, session, signOut };
}
