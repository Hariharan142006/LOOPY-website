'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { MapPin, User, Phone, Calendar, Package, AlertTriangle, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface PickupDetailViewProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
    onUpdate: (bookingId: string, updates: any) => Promise<void>;
    onDelete: (bookingId: string) => Promise<void>;
    agents: any[];
}

export function PickupDetailView({ isOpen, onClose, booking, onUpdate, onDelete, agents }: PickupDetailViewProps) {
    const [status, setStatus] = useState(booking?.status || 'PENDING');
    const [agentId, setAgentId] = useState(booking?.agentId || 'unassigned');
    const [remarks, setRemarks] = useState(booking?.remarks || '');
    const [items, setItems] = useState<any[]>(booking?.items || []);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (booking) {
            setStatus(booking.status);
            setAgentId(booking.agentId || 'unassigned');
            setRemarks(booking.remarks || '');
            setItems(booking.items || []);
        }
    }, [booking]);

    if (!booking) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate(booking.id, {
                status,
                agentId: agentId === 'unassigned' ? null : agentId,
                remarks,
            });
            toast.success("Pickup updated successfully");
            onClose();
        } catch (error) {
            toast.error("Failed to update pickup");
        } finally {
            setIsSaving(false);
        }
    };

    const handleItemQtyChange = (itemId: string, newQty: string) => {
        setItems(items.map(i => i.id === itemId ? { ...i, quantity: parseFloat(newQty) } : i));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[600px] bg-gray-900 border-white/10 text-white max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center justify-between">
                        <span>Pickup #{booking.id.slice(-6)}</span>
                        <Badge variant="outline" className="ml-2">{booking.status}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Full details and operational controls.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Customer Info */}
                    <div className="space-y-4 rounded-lg bg-white/5 p-4 border border-white/10">
                        <h3 className="font-semibold text-gray-300 flex items-center gap-2">
                            <User className="h-4 w-4" /> Customer Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="text-xs text-gray-500">Name</label>
                                <p>{booking.user?.name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Phone</label>
                                <p className="flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    {booking.user?.phone}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-gray-500">Address</label>
                                <p className="flex items-start gap-2">
                                    <MapPin className="h-3 w-3 mt-1 shrink-0" />
                                    {booking.address?.label || booking.address?.street || 'No address provided'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Operational Controls */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-300">Operations</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                                        <SelectItem value="ARRIVED">Arrived</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Assigned Agent</Label>
                                <Select value={agentId} onValueChange={setAgentId}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Select Agent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {agents?.map((agent: any) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                {agent.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Scheduled Time</Label>
                                <div className="h-10 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm flex items-center gap-2 text-gray-400 cursor-not-allowed">
                                    <Calendar className="h-4 w-4" />
                                    {booking.scheduledAt ? format(new Date(booking.scheduledAt), 'MMM d, h:mm a') : 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Admin Remarks (Internal)</Label>
                            <Textarea
                                placeholder="Add notes for other admins..."
                                className="bg-white/5 border-white/10 text-white min-h-[80px]"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Weight Dispute / Edit */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-300 flex items-center gap-2">
                                <Package className="h-4 w-4" /> Items & Weights
                            </h3>
                            <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Editable
                            </Badge>
                        </div>

                        <div className="space-y-3">
                            {items.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded bg-white/5 border border-white/5">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{item.item.name}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-gray-500">{item.item.category?.name}</p>
                                            <Badge variant="outline" className="text-[10px] h-4 py-0 border-gray-700 text-gray-400">
                                                ₹{item.priceAtBooking}/{item.item.unit}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-[120px]">
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemQtyChange(item.id, e.target.value)}
                                            className="h-8 bg-black/20 text-right border-white/10"
                                        />
                                        <span className="text-xs text-gray-500 w-8">{item.item.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Summary */}
                        <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-green-500 font-bold uppercase tracking-wider">Final Payout</p>
                                <p className="text-2xl font-black text-white">₹{booking.totalAmount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Evidence Gallery */}
                    <div className="space-y-4 pb-4">
                        <h3 className="font-semibold text-gray-300 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Evidence & Audit Photos
                        </h3>
                        
                        {booking.evidenceImages && booking.evidenceImages.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                                {booking.evidenceImages.map((img: string, idx: number) => (
                                    <div key={idx} className="aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden relative group">
                                        <img 
                                            src={img} 
                                            alt={`Evidence ${idx + 1}`} 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button variant="ghost" size="sm" className="text-white text-xs" onClick={() => window.open(img, '_blank')}>
                                                View Large
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 rounded-xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-gray-600 mb-2" />
                                <p className="text-xs text-gray-500 italic">No agent photos available for this pickup.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex gap-2">
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this booking completely?")) {
                                onDelete(booking.id);
                            }
                        }}
                    >
                        Delete Pickup
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
