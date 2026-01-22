import React from 'react';
import '../styles/MaintenanceNotification.css';

interface MaintenanceNotificationProps {
  message: string;
  reconnectIn?: number;
  isReconnecting?: boolean;
}

/**
 * Display maintenance notification when server is shutting down
 * Shows auto-reconnection progress
 */
export const MaintenanceNotification: React.FC<MaintenanceNotificationProps> = ({
  message,
  reconnectIn,
  isReconnecting
}) => {
  const [countdown, setCountdown] = React.useState(
    reconnectIn ? Math.ceil(reconnectIn / 1000) : 0
  );

  React.useEffect(() => {
    if (!reconnectIn) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [reconnectIn]);

  return (
    <div className="maintenance-notification">
      <div className="maintenance-alert">
        <div className="maintenance-header">
          {isReconnecting ? (
            <>
              <div className="spinner"></div>
              <strong>Reconnecting...</strong>
            </>
          ) : (
            <>
              <span className="warning-icon">⚠️</span>
              <strong>Server Maintenance</strong>
            </>
          )}
        </div>
        <p className="maintenance-message">{message}</p>
        {countdown > 0 && (
          <p className="maintenance-countdown">
            Reconnecting in {countdown} seconds...
          </p>
        )}
      </div>
    </div>
  );
};

export default MaintenanceNotification;

