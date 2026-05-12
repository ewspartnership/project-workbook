window.storage = {
  get: async (key) => {
    const val = localStorage.getItem(key);
    return val !== null ? { value: val } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
  },
  delete: async (key) => {
    localStorage.removeItem(key);
  },
};
