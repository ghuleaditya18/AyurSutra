export const formatApiError = (error, fallbackMessage = 'An error occurred. Please try again.') => {
  if (!error) return fallbackMessage;

  const data = error.response?.data;
  if (!data) {
    return error.message || fallbackMessage;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (data.detail && typeof data.detail === 'string') {
    return data.detail;
  }

  if (data.error && typeof data.error === 'string') {
    return data.error;
  }

  if (data.message && typeof data.message === 'string') {
    return data.message;
  }

  // Handle dictionary of field errors: { phone: ["..."], email: ["..."] }
  if (typeof data === 'object') {
    const messages = [];
    for (const [key, value] of Object.entries(data)) {
      const fieldName = key.replace(/_/g, ' ');
      if (Array.isArray(value)) {
        messages.push(`${fieldName}: ${value.join(' ')}`);
      } else if (typeof value === 'string') {
        messages.push(`${fieldName}: ${value}`);
      } else if (typeof value === 'object' && value !== null) {
        messages.push(`${fieldName}: ${JSON.stringify(value)}`);
      }
    }
    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }

  return fallbackMessage;
};
