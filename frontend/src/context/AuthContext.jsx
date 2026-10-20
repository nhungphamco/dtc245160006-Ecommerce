import { useCallback, useEffect, useMemo, useState } from "react";

import {
    getCurrentUser,
    loginAccount,
    logoutAccount,
    registerAccount
} from "../services/api";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState("checking");
    const [sessionError, setSessionError] = useState("");

    const loadSession = useCallback(async (signal) => {
        try {
            const currentUser = await getCurrentUser({ signal });
            return { user: currentUser, status: "authenticated", error: "" };
        } catch (error) {
            if (signal?.aborted) {
                return null;
            }

            if (error.status === 401) {
                return { user: null, status: "anonymous", error: "" };
            }

            return { user: null, status: "error", error: error.message };
        }
    }, []);

    const refreshSession = useCallback(async () => {
        setStatus("checking");
        setSessionError("");
        const result = await loadSession();

        if (!result) return;

        setUser(result.user);
        setStatus(result.status);
        setSessionError(result.error);
    }, [loadSession]);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        loadSession(controller.signal).then((result) => {
            if (!active || !result) return;

            setUser(result.user);
            setStatus(result.status);
            setSessionError(result.error);
        });

        return () => {
            active = false;
            controller.abort();
        };
    }, [loadSession]);

    const login = useCallback(async (credentials) => {
        const authenticatedUser = await loginAccount(credentials);
        setUser(authenticatedUser);
        setSessionError("");
        setStatus("authenticated");
        return authenticatedUser;
    }, []);

    const register = useCallback(async (details) => {
        const authenticatedUser = await registerAccount(details);
        setUser(authenticatedUser);
        setSessionError("");
        setStatus("authenticated");
        return authenticatedUser;
    }, []);

    const logout = useCallback(async () => {
        await logoutAccount();
        setUser(null);
        setSessionError("");
        setStatus("anonymous");
    }, []);

    const value = useMemo(() => ({
        user,
        status,
        sessionError,
        refreshSession,
        login,
        register,
        logout
    }), [user, status, sessionError, refreshSession, login, register, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
