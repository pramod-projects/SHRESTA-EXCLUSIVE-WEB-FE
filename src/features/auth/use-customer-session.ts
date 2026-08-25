"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCustomerSession,
  logoutCustomerSession,
  type CustomerSession
} from "@/features/auth/customer-session";
import { reportClientNonFatal } from "@/lib/client-observability";

export function useCustomerSession() {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    void fetchCustomerSession({ force: true })
      .then(setSession)
      .catch((error) => {
        reportClientNonFatal("customer-session.refresh", error);
        setSession(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCustomerSession({ force: true })
      .then((profile) => {
        if (active) {
          setSession(profile);
        }
      })
      .catch((error) => {
        reportClientNonFatal("customer-session.initial-fetch", error);
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
    void logoutCustomerSession()
      .catch((error) => {
        reportClientNonFatal("customer-session.signout", error);
      })
      .finally(() => setSession(null));
  }, []);

  return { isLoading, refresh, session, signOut };
}
