'use client';

import React, { useState, useEffect } from 'react';
import { 
    MessageSquare, 
    Search, 
    Filter, 
    User, 
    Clock, 
    CheckCircle, 
    AlertCircle, 
    Send,
    ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [reply, setReply] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/support/tickets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && Array.isArray(data)) {
                setTickets(data);
            } else {
                console.error("Fetch Tickets Error:", data);
                setTickets([]);
                if (data.error) toast.error(data.error);
            }
        } catch (error) {
            toast.error("Failed to load tickets");
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (ticketId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && Array.isArray(data)) {
                setMessages(data);
            } else {
                console.error("Messages Error", data);
                setMessages([]);
                if (data.error) toast.error(data.error);
            }
        } catch (error) {
            console.error("Messages Error", error);
            setMessages([]);
        }
    };

    const handleSelectTicket = (ticket: any) => {
        setSelectedTicket(ticket);
        fetchMessages(ticket.id);
    };

    const handleSendReply = async () => {
        if (!reply.trim() || !selectedTicket) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: reply })
            });

            if (res.ok) {
                const newMessage = await res.json();
                setMessages([...messages, newMessage]);
                setReply('');
                toast.success("Reply sent");
            }
        } catch (error) {
            toast.error("Failed to send reply");
        }
    };

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex h-[calc(100vh-100px)] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Sidebar / Ticket List */}
            <div className={`w-full md:w-1/3 border-r border-gray-100 bg-white flex flex-col ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 border-b border-gray-100 space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        User Support
                    </h2>
                    
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search tickets or users..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-green-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === status ? 'bg-green-600 text-white shadow-md shadow-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center p-10"><Clock className="w-6 h-6 animate-spin text-gray-300" /></div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center p-10 text-gray-400 text-sm">No tickets found</div>
                    ) : (
                        filteredTickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => handleSelectTicket(ticket)}
                                className={`w-full text-left p-4 rounded-xl transition-all border ${selectedTicket?.id === ticket.id ? 'bg-green-50/50 border-green-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === 'OPEN' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {ticket.status}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-800 line-clamp-1 mb-1">{ticket.subject}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <User className="w-3 h-3" />
                                    <span>{ticket.user?.name || 'Unknown'}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col bg-white ${!selectedTicket ? 'hidden md:flex' : 'flex'}`}>
                {selectedTicket ? (
                    <>
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedTicket(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
                                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{selectedTicket.subject}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <User className="w-3 h-3" />
                                            <span>{selectedTicket.user?.name}</span>
                                        </div>
                                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                        <div className="text-xs text-gray-500">{selectedTicket.user?.phone}</div>
                                    </div>
                                </div>
                            </div>

                            <select 
                                value={selectedTicket.status}
                                onChange={async (e) => {
                                    // Handle status change
                                    const newStatus = e.target.value;
                                    const token = localStorage.getItem('token');
                                    await fetch(`/api/support/tickets/${selectedTicket.id}/status`, {
                                        method: 'PATCH',
                                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: newStatus })
                                    });
                                    fetchTickets();
                                }}
                                className="text-xs font-bold text-gray-900 border-none bg-gray-100 rounded-lg px-3 py-1.5 focus:ring-0"
                            >
                                <option value="OPEN">Mark as Open</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="RESOLVED">Mark as Resolved</option>
                                <option value="CLOSED">Close Ticket</option>
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 custom-scrollbar">
                            {Array.isArray(messages) && messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] ${msg.isAdmin ? 'order-last text-right' : 'text-left'}`}>
                                        <div className={`inline-block p-4 rounded-2xl text-sm shadow-sm ${msg.isAdmin ? 'bg-green-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                                            {msg.text}
                                        </div>
                                        <div className="mt-2 text-[10px] text-gray-400 font-medium">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100">
                            <div className="relative flex items-end gap-3 max-w-4xl mx-auto">
                                <div className="flex-1 relative">
                                    <textarea 
                                        placeholder="Type your reply here..."
                                        rows={1}
                                        className="w-full pr-12 pl-4 py-4 md:py-5 bg-gray-50 border-none rounded-2xl resize-none text-sm text-gray-900 focus:ring-2 focus:ring-green-500 transition-all overflow-hidden min-h-[56px] max-h-[150px]"
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendReply();
                                            }
                                        }}
                                    />
                                </div>
                                <button 
                                    onClick={handleSendReply}
                                    disabled={!reply.trim()}
                                    className="h-14 w-14 md:h-16 md:w-16 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl shadow-lg shadow-green-100 transition-all"
                                >
                                    <Send className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                            </div>
                            <p className="text-center text-[10px] text-gray-400 mt-4">
                                Press Enter to send, Shift + Enter for new line
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-gray-50/10">
                        <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mb-6">
                            <MessageSquare className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Support Ticket</h3>
                        <p className="text-gray-500 text-sm max-w-xs">
                            Choose a ticket from the list to view history and respond to customer queries.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
