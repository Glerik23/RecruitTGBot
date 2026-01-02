import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: string[];
    userRole?: string;
    isLoading: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
    userRole,
    isLoading
}) => {
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-background text-text">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-hint font-medium animate-pulse">Перевірка доступу...</p>
            </div>
        );
    }

    if (!userRole) {
        // Not logged in or no role found
        return <Navigate to="/candidate/application" replace />;
    }

    if (!allowedRoles.includes(userRole)) {
        // Access denied - redirect to appropriate landing page based on role
        console.warn(`Access denied for role ${userRole} to ${location.pathname}`);

        switch (userRole) {
            case 'hr':
                return <Navigate to="/hr/applications" replace />;
            case 'analyst':
                return <Navigate to="/analyst/dashboard" replace />;
            case 'director':
                return <Navigate to="/director" replace />;
            case 'interviewer':
                return <Navigate to="/interviewer" replace />;
            case 'candidate':
            default:
                return <Navigate to="/candidate/application" replace />;
        }
    }

    return <>{children}</>;
};
