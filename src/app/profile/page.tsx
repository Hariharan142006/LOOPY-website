'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { updateUserProfileAction } from '@/app/profile-actions';
import { getWalletBalanceAction } from '@/app/wallet-actions';
import { addAddressAction, getUserAddressesAction, deleteAddressAction } from '@/app/address-actions';
import { Loader2, ArrowLeft, QrCode, Save, User, Wallet, MapPin, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/map-picker-leaflet'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-lg" />
});

export default function ProfilePage() {
    const { user, login: setUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [showAddAddress, setShowAddAddress] = useState(false);

    // Profile Form
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    // New Address Form
    const [newAddress, setNewAddress] = useState({
        label: 'Home',
        street: '',
        city: '',
        state: '',
        zip: '',
        lat: 0,
        lng: 0
    });
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || ''
            });
            loadWallet();
            loadAddresses();
        }
    }, [user]);

    const loadWallet = async () => {
        if (!user?.id) return;
        const balance = await getWalletBalanceAction(user.id);
        setWalletBalance(balance);
    };

    const loadAddresses = async () => {
        if (!user?.id) return;
        const data = await getUserAddressesAction(user.id);
        setAddresses(data);
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        setIsLoading(true);
        try {
            const result = await updateUserProfileAction(user.id, formData);
            if (result.success && user) {
                toast.success('Profile updated successfully');
                setUser({ ...user, name: formData.name, email: formData.email, phone: formData.phone });
            } else {
                toast.error('Failed to update profile');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddAddress = async () => {
        if (!user?.id) return;
        if (!newAddress.street || !newAddress.city) {
            toast.error("Street and City are required");
            return;
        }

        try {
            const result = await addAddressAction(user.id, newAddress);
            if (result.success) {
                toast.success("Address added!");
                setShowAddAddress(false);
                loadAddresses();
                // Reset form
                setNewAddress({ label: 'Home', street: '', city: '', state: '', zip: '', lat: 0, lng: 0 });
            } else {
                toast.error("Failed to add address");
            }
        } catch (error) {
            toast.error("Error adding address");
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (confirm("Are you sure you want to delete this address?")) {
            await deleteAddressAction(id);
            toast.success("Address deleted");
            loadAddresses();
        }
    };

    const handleUseCurrentLocation = () => {
        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setNewAddress(prev => ({ ...prev, lat: latitude, lng: longitude }));

                    // Reverse Geocode
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();
                        if (data && data.address) {
                            setNewAddress(prev => ({
                                ...prev,
                                street: data.address.road || data.display_name.split(',')[0] || '',
                                city: data.address.city || data.address.town || data.address.village || '',
                                state: data.address.state || '',
                                zip: data.address.postcode || '',
                                lat: latitude,
                                lng: longitude
                            }));
                        }
                    } catch (error) {
                        toast.error("Could not fetch address details, please enter manually");
                    } finally {
                        setIsLocating(false);
                    }
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    let errorMessage = "Location access denied";
                    if (error.code === error.TIMEOUT) errorMessage = "Location request timed out";
                    toast.error(errorMessage);
                    setIsLocating(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setIsLocating(false);
            toast.error("Geolocation not supported");
        }
    };

    if (!user) return <div className="p-8 text-center">Please login to view profile</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 p-4">
            <div className="max-w-md mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                </div>

                {/* Identity Card */}
                <Card className="bg-white border-gray-200 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-blue-500" />
                    <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
                        <div className="bg-white p-2 rounded-xl shadow-inner border border-gray-100 mb-4">
                            <QRCode 
                                value={JSON.stringify({ userId: user.id, type: 'PAYMENT_RECEIVE', name: user.name })} 
                                size={120} 
                            />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                        <p className="text-sm text-gray-500 mb-4">{user.phone}</p>

                        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            ₹{Math.floor(walletBalance)}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Show this QR to agent for payments</p>
                    </CardContent>
                </Card>

                {/* Personal Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-500" /> Personal Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Saved Addresses */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-green-500" /> Saved Addresses
                        </CardTitle>
                        <Dialog open={showAddAddress} onOpenChange={setShowAddAddress}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1">
                                    <Plus className="h-4 w-4" /> Add New
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Add New Address</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Button type="button" variant="secondary" onClick={handleUseCurrentLocation} disabled={isLocating} className="w-full gap-2">
                                        {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                        {isLocating ? "Detecting Location..." : "Use Current Location"}
                                    </Button>
                                    <div className="space-y-2">
                                        <Label>Label (e.g. Home, Office)</Label>
                                        <Input
                                            value={newAddress.label}
                                            onChange={e => setNewAddress({ ...newAddress, label: e.target.value })}
                                            placeholder="Home"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Street / Area</Label>
                                            <Input
                                                value={newAddress.street}
                                                onChange={e => setNewAddress({ ...newAddress, street: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>City</Label>
                                            <Input
                                                value={newAddress.city}
                                                onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>State</Label>
                                            <Input
                                                value={newAddress.state}
                                                onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Zip Code</Label>
                                            <Input
                                                value={newAddress.zip}
                                                onChange={e => setNewAddress({ ...newAddress, zip: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="h-[200px] w-full rounded-md overflow-hidden border">
                                        <MapPicker
                                            onLocationSelect={(lat, lng, address) => {
                                                setNewAddress(prev => ({ ...prev, lat, lng }));
                                            }}
                                            initialLat={newAddress.lat || 20.5937}
                                            initialLng={newAddress.lng || 78.9629}
                                        />
                                    </div>

                                    <Button onClick={handleAddAddress} className="w-full bg-green-600 hover:bg-green-700">Save Address</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {addresses.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No saved addresses. Add one for quick booking.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {addresses.map((addr: any) => (
                                    <div key={addr.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900">{addr.label}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{addr.street}, {addr.city}</p>
                                            <p className="text-xs text-gray-400">{addr.zip}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDeleteAddress(addr.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
