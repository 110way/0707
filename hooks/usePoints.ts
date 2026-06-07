'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function usePoints() {
  const { user, refreshUser } = useAuth();
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (user) {
      setPoints(user.pointsBalance);
    }
  }, [user]);

  // Sync points from the backend
  const updatePoints = async () => {
    await refreshUser();
  };

  return {
    points,
    updatePoints,
  };
}
