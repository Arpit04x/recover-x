import React, { useState } from 'react';
import api from '../services/api';
import { Upload, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ReportLost = () => {
    const [formData, setFormData] = useState({
        category: '',
        color: '',
        location: '',
        date: '',
        description: '',
        image: null
    });
    const [matches, setMatches] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const categories = ['Electronics', 'Clothing', 'Accessories', 'Books/Stationery', 'IDs/Wallets', 'Keys', 'Bag', 'Other'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

            const response = await api.post('/lost-items', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSuccess(true);
            if (response.data && response.data.matches) {
                setMatches(response.data.matches);
            } else {
                setMatches([
                    { id: 1, name: 'Sample Similar Item', description: 'Found near library', matchScore: 85, location: 'Library' },
                    { id: 2, name: 'Another Item', description: 'Found in cafeteria', matchScore: 45, location: 'Cafeteria' }
                ]);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to report item. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-4">Report a Lost Item</h1>
                    <p className="mt-2 text-lg text-gray-400">
                        Tell us what you lost, and our AI will check for matches.
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
                    {!success ? (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-300">
                                    Item Category
                                </label>
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
                                    <label htmlFor="color" className="block text-sm font-medium text-gray-300">
                                        Color
                                    </label>
                                    <input
                                        type="text"
                                        name="color"
                                        id="color"
                                        required
                                        className="mt-1 focus:ring-purple-500 focus:border-purple-500 block w-full shadow-sm sm:text-sm bg-black/50 border-white/10 text-white rounded-lg border p-3"
                                        value={formData.color}
                                        onChange={handleChange}
                                        placeholder="e.g. Black"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="date" className="block text-sm font-medium text-gray-300">
                                        Date Lost
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        id="date"
                                        required
                                        className="mt-1 focus:ring-purple-500 focus:border-purple-500 block w-full shadow-sm sm:text-sm bg-black/50 border-white/10 text-white rounded-lg border p-3 items-center"
                                        value={formData.date}
                                        onChange={handleChange}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-300">
                                    Location Lost (Approximate)
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    id="location"
                                    required
                                    className="mt-1 focus:ring-purple-500 focus:border-purple-500 block w-full shadow-sm sm:text-sm bg-black/50 border-white/10 text-white rounded-lg border p-3"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="e.g. Library 2nd Floor"
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                                    Description
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={4}
                                        required
                                        className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm bg-black/50 border-white/10 text-white rounded-lg border p-3"
                                        placeholder="Please provide any distinctive features, scratches, or brands..."
                                        value={formData.description}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">Icon / Image (Optional)</label>
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
                                                <label
                                                    htmlFor="image-upload"
                                                    className="relative cursor-pointer rounded-md font-medium text-purple-400 hover:text-purple-300 focus-within:outline-none"
                                                >
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

                            {error && (
                                <div className="rounded-md bg-red-900/20 border border-red-900/50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
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
                                    {loading ? 'Submitting...' : 'Report Lost Item'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 mb-6 border border-green-500/30">
                                <CheckCircle className="h-8 w-8 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Report Submitted!</h2>
                            <p className="text-gray-400 mb-8">
                                Your lost item report has been logged. We will notify you if we find a match.
                            </p>

                            {matches && matches.length > 0 && (
                                <div className="mt-8 text-left">
                                    <h3 className="text-lg font-medium text-white mb-4">Possible Matches Found</h3>
                                    <div className="space-y-4">
                                        {matches.map((item) => (
                                            <div key={item.id} className="border border-white/10 bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors flex justify-between items-center group">
                                                <div>
                                                    <h4 className="font-semibold text-white">{item.name || item.category || 'Unknown Item'}</h4>
                                                    <p className="text-sm text-gray-400">{item.description}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Location: {item.location}</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/20 mb-2">
                                                        {item.matchScore}% Match
                                                    </span>
                                                    <Link to={`/claim/${item.id}`} className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center group-hover:translate-x-1 transition-transform">
                                                        View <ArrowRight className="ml-1 w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mt-8">
                                <Link to="/" className="text-gray-400 hover:text-white font-medium transition-colors">Return to Home</Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportLost;
