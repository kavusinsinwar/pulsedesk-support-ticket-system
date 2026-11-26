import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { MotionRoot } from '@/components/ui/MotionRoot';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulseDesk | Support Ticket Tracker',
  description:
    'Real-time Support Ticket Management System with Kanban Board, Event-Driven Workflows, and Role-Based Access Control.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <MotionRoot>
          <ThemeProvider>
            <TooltipProvider>
              <AuthProvider>
                <SocketProvider>
                  <ToastProvider>{children}</ToastProvider>
                </SocketProvider>
              </AuthProvider>
            </TooltipProvider>
          </ThemeProvider>
        </MotionRoot>
      </body>
    </html>
  );
}
