import React, { useState } from 'react';
import api from '../services/api';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ReportFound = () => {
    const [formData, setFormData] = useState({
        category: '',
        color: '',
        location: '',
        date: '',
        description: '',
        image: null,
        anonymous: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const categories = ['Electronics', 'Clothing', 'Accessories', 'Books/Stationery', 'IDs/Wallets', 'Keys', 'Bag', 'Other'];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        setFormData(prev => ({ ...prev, image: file }));
        
        if (file) {
            try {
                const mlFormData = new FormData();
                mlFormData.append('image', file);
                const response = await fetch('http://localhost:5001/predict', {
                    method: 'POST',
                    body: mlFormData
                });
                const result = await response.json();
                if (result.prediction && result.prediction !== 'uncertain') {
                    let newCategory = 'Other';
                    if (result.prediction === 'wallet') newCategory = 'IDs/Wallets';
                    if (result.prediction === 'bag') newCategory = 'Accessories';
                    
                    setFormData(prev => ({ ...prev, category: newCategory }));
                    alert(`RecoverX AI classified this as a ${result.prediction} (${(result.confidence * 100).toFixed(1)}% confident)`);
                }
            } catch (err) {
                console.error("RecoverX ML Prediction failed", err);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            await api.post('/found-items', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSuccess(true);
        } catch (err) {
            console.error(err);
            setError('Failed to report found item. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full bg-white/5 border border-white/10 shadow-2xl rounded-2xl p-10 text-center backdrop-blur-xl">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 mb-6 border border-green-500/30">
                        <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
                    <p className="text-gray-400 mb-8">
                        Your report helps us reunite lost items with their owners.
                    </p>
                    <Link to="/" className="text-purple-400 hover:text-purple-300 font-medium block">
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">Report a Found Item</h1>
                    <p className="mt-2 text-lg text-gray-400">
                        Help us return lost items. Thank you for your honesty!
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-300">Category</label>
                            <select
                                id="category"
                                name="category"
                                required
                                className="mt-1 block w-full pl-3 pr-10 py-3 text-base bg-black/50 border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-lg border transition-all"
                                value={formData.category}
                                onChange={handleChange}
                            >
                                <option value="" className="bg-gray-900">Select a category</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="color" className="block text-sm font-medium text-gray-300">Color</label>
                                <input
                                    type="text"
                                    name="color"
                                    id="color"
                                    required
                                    className="mt-1 focus:ring-purple-500 focus:border-purple-500 block w-full shadow-sm sm:text-sm bg-black/50 border-white/10 text-white rounded-lg border p-3"
                                    value={formData.color}
                                    onChange={handleChange}
                                    placeholder="e.g. Blue"
                                />
                            </div>

                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-300">Date Found</label>
                                <input
                                    type="date"
                                    name="date"
                                    id="date"
                                    required
                                    className="mt-1 focus:ring-purple-500 focus:border-purple-500 block w-full shadow-sm sm:text-sm bg-black/50 border-white/10 text-white rounded-lg border p-3"
                                    value={formData.date}
                                    onChange={handleChange}
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-300">Location Found</label>
                            <input
                                type="text"
                                name="location"
                                id="location"
                                required
                                className="mt-1 focus:ring-purple-500 focus:border-purple-500 block w-full shadow-sm sm:text-sm bg-black/50 border-white/10 text-white rounded-lg border p-3"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="e.g. Cafeteria Table 4"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                required
                                className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm bg-black/50 border-white/10 text-white rounded-lg border p-3"
                                placeholder="Describe the item..."
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300">Image (Optional)</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/10 border-dashed rounded-lg hover:border-purple-500/50 transition-colors bg-white/5">
                                <div className="space-y-1 text-center">
                                    {formData.image ? (
                                        <div className="text-purple-400">
                                            <CheckCircle className="mx-auto h-12 w-12 mb-2" />
                                            <p className="text-sm font-medium">{formData.image.name}</p>
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                                                className="text-xs text-gray-400 hover:text-white mt-1"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-400 justify-center">
                                                <label htmlFor="image-upload" className="relative cursor-pointer rounded-md font-medium text-purple-400 hover:text-purple-300 focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input id="image-upload" name="image" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="anonymous"
                                    name="anonymous"
                                    type="checkbox"
                                    className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
                                    checked={formData.anonymous}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="anonymous" className="font-medium text-gray-300">Report Anonymously</label>
                                <p className="text-gray-500">Check this if you don't want your name associated with this report.</p>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-900/20 border border-red-900/50 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertCircle className="h-5 w-5 text-red-400" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-200">{error}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white transition-all transform hover:scale-[1.02] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Submitting...' : 'Report Found Item'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReportFound;
