import axios from 'axios';
import { mockBackend } from './mockBackend';

// CONSTANT TO TOGGLE MOCK MODE
const USE_MOCK_BACKEND = false;

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Mock Interceptor / Proxy
const mockApi = {
    get: async (url, config) => {
        if (USE_MOCK_BACKEND) return handleMockGet(url, config);
        return api.get(url, config);
    },
    post: async (url, data, config) => {
        if (USE_MOCK_BACKEND) return handleMockPost(url, data, config);
        return api.post(url, data, config);
    },
    patch: async (url, data, config) => {
        if (USE_MOCK_BACKEND) return handleMockPatch(url, data);
        return api.patch(url, data, config);
    },
    delete: async (url) => {
        return api.delete(url);
    }
};

// Request handlers for Mock
const handleMockGet = (url, config) => {
    console.log(`[MOCK API] GET ${url}`);
    if (url === '/admin/stats') return mockBackend.getStats();
    if (url.startsWith('/admin/claims') && !url.includes('/', 14)) return mockBackend.getClaimsList(config?.params || getParams(url)); // List
    if (url.startsWith('/items/') && !url.includes('claim')) {
        const id = url.split('/')[2];
        return mockBackend.getItem(id);
    }
    if (url.startsWith('/admin/claims/')) {
        const id = url.split('/').pop();
        return mockBackend.getClaimDetails(id);
    }
    if (url === '/analytics') return mockBackend.getAnalytics();

    return Promise.reject({ message: 'Mock route not found' });
};

const handleMockPost = (url, data) => {
    console.log(`[MOCK API] POST ${url}`, data);
    if (url === '/auth/login') return mockBackend.login(data.email, data.password);
    if (url === '/lost-items') return mockBackend.reportLost(data);
    if (url === '/found-items') return mockBackend.reportFound(data);
    if (url.includes('/claim')) {
        const id = url.split('/')[2];
        return mockBackend.submitClaim(id, data);
    }
    return Promise.reject({ message: 'Mock route not found' });
};

const handleMockPatch = (url, data) => {
    console.log(`[MOCK API] PATCH ${url}`, data);
    if (url.startsWith('/admin/claims/')) {
        const id = url.split('/').pop();
        return mockBackend.updateClaimStatus(id, data.status);
    }
    return Promise.reject({ message: 'Mock route not found' });
};

function getParams(url) {
    const urlObj = new URL('http://dummy' + url);
    return Object.fromEntries(urlObj.searchParams);
}

export default mockApi;
