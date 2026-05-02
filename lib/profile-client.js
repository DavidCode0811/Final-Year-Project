async function parseResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

function createAuthorizedHeaders(token) {
  if (!token) {
    throw new Error('No active session found. Please sign in again.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchCurrentProfile(token) {
  const response = await fetch('/api/auth/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  return parseResponse(response, 'Failed to load your profile.');
}

export async function updateCurrentProfile(token, payload) {
  const response = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: createAuthorizedHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to update your profile.');
}

export async function changeCurrentPassword(token, payload) {
  const response = await fetch('/api/auth/password', {
    method: 'POST',
    headers: createAuthorizedHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to update your password.');
}
