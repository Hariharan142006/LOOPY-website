'use client';

import React, { useState, useEffect } from 'react';
import { 
    Gift, 
    Plus, 
    Trash2, 
    Save, 
    RefreshCcw, 
    CheckCircle,
    Info,
    Tag,
    DollarSign,
    ToggleLeft,
    ToggleRight,
    Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralManagementPage() {
    const [referrals, setReferrals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    const [newReferral, setNewReferral] = useState({
        referralCode: '',
        rewardAmount: '',
        description: '',
        isActive: true
    });

    useEffect(() => {
        fetchReferrals();
    }, []);

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/referrals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setReferrals(data);
        } catch (error) {
            toast.error("Failed to load referrals");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newReferral.referralCode || !newReferral.rewardAmount) {
            toast.error("Please fill required fields");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/referrals', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newReferral)
            });

            if (res.ok) {
                const data = await res.json();
                setReferrals([data, ...referrals]);
                setIsAdding(false);
                setNewReferral({ referralCode: '', rewardAmount: '', description: '', isActive: true });
                toast.success("Referral code created successfully");
            }
        } catch (error) {
            toast.error("Failed to create referral");
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        // Implementation for status toggle if API supports it
        toast.info("Status update coming soon");
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <Gift className="w-6 h-6 text-green-400" />
                        </div>
                        Referral & Coupons
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm font-medium">Manage growth incentives and promotional codes for your users.</p>
                </div>
                
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-green-900/20 hover:scale-[1.02] active:scale-95"
                >
                    {isAdding ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAdding ? 'Cancel' : 'Create New Code'}
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Active Codes', value: referrals.filter(r => r.isActive).length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
                    { label: 'Total Reward Distributed', value: '₹4,500', icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'New Signups via Referrals', value: '128', icon: Tag, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-white mb-1">{stat.value}</h3>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Addition Form */}
            {isAdding && (
                <div className="bg-white/5 border border-green-500/30 rounded-3xl p-8 animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        Configure New Incentive
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Referral Code</label>
                            <input 
                                type="text"
                                placeholder="e.g. WELCOME100"
                                className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-green-500 focus:ring-0 transition-all font-bold"
                                value={newReferral.referralCode}
                                onChange={(e) => setNewReferral({...newReferral, referralCode: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Reward (₹)</label>
                            <input 
                                type="number"
                                placeholder="50"
                                className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-green-500 focus:ring-0 transition-all font-bold"
                                value={newReferral.rewardAmount}
                                onChange={(e) => setNewReferral({...newReferral, rewardAmount: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Description</label>
                            <input 
                                type="text"
                                placeholder="Internal note for this incentive..."
                                className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-green-500 focus:ring-0 transition-all font-medium"
                                value={newReferral.description}
                                onChange={(e) => setNewReferral({...newReferral, description: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button 
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-8 py-4 bg-green-600 text-white font-black rounded-xl hover:bg-green-500 transition-all active:scale-95 shadow-xl shadow-green-900/40"
                        >
                            <Save className="w-5 h-5" />
                            Launch Incentive
                        </button>
                    </div>
                </div>
            )}

            {/* Codes Table */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Active Referral Configurations
                    </h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/10">Code</th>
                                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/10">Reward</th>
                                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/10">Description</th>
                                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/10">Status</th>
                                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/10">Modified</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <RefreshCcw className="w-10 h-10 animate-spin text-gray-700 mx-auto" />
                                        <p className="text-gray-500 mt-4 font-bold">Synchronizing referral data...</p>
                                    </td>
                                </tr>
                            ) : referrals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <Gift className="w-10 h-10 text-gray-800 mx-auto opacity-20" />
                                        <p className="text-gray-600 mt-4 font-bold">No referral codes configured yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                referrals.map((r) => (
                                    <tr key={r.id} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center font-black text-green-400 text-xs shadow-inner">
                                                    {r.referralCode.slice(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-white font-black tracking-wider group-hover:text-green-400 transition-colors uppercase">{r.referralCode}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">ID: {r.id.slice(-6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-1">
                                                <span className="text-green-400 font-black text-lg">₹{r.rewardAmount}</span>
                                                <span className="text-gray-600 font-bold text-xs">/signup</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-gray-400 text-sm font-medium line-clamp-1 italic">"{r.description || 'No description provided'}"</p>
                                        </td>
                                        <td className="p-6">
                                            <button 
                                                onClick={() => toggleStatus(r.id, r.isActive)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${r.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}
                                            >
                                                {r.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                {r.isActive ? 'OPERATIONAL' : 'PAUSED'}
                                            </button>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                                                <Clock className="w-3 h-3" />
                                                {new Date(r.updatedAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Info */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 flex items-start gap-4 mx-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Info className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm mb-1">How do referral codes work?</h4>
                    <p className="text-gray-400 text-xs leading-relaxed max-w-2xl">
                        Referral codes created here are visible to all users in the 'Refer & Earn' section of the mobile app. 
                        When a new user signs up using one of these codes, the specified reward amount is credited to their wallet 
                        upon their first successful scrap pickup completion.
                    </p>
                </div>
            </div>
        </div>
    );
}
