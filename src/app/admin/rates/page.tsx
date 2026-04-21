'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label'; // Corrected import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save, Pencil, History, Calendar, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import { getScrapItemsAction, createScrapItemAction, deleteScrapItemAction, getCategoriesAction, updateScrapItemAction } from '@/app/actions';
import { ScrapItemWithCategory } from '@/lib/types';
import { HistoryModal } from '@/components/admin/rates/history-modal';
import { ScheduleModal, ScheduledRateData } from '@/components/admin/rates/schedule-modal';

// Helper for formatting currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

// Mock Cities
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];

export default function AdminRatesPage() {
    const [items, setItems] = useState<ScrapItemWithCategory[]>([]);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cityFilter, setCityFilter] = useState('all');

    // Modal States
    const [historyItem, setHistoryItem] = useState<ScrapItemWithCategory | null>(null);
    const [scheduleItem, setScheduleItem] = useState<ScrapItemWithCategory | null>(null);

    // Create/Edit Item State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        categoryId: '',
        basePrice: '',
        currentPrice: '',
        unit: 'kg',
        image: ''
    });
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [itemsData, catsData] = await Promise.all([
                getScrapItemsAction(),
                getCategoriesAction()
            ]);
            setItems(itemsData);
            setCategories(catsData);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = {
                name: newItem.name,
                categoryId: newItem.categoryId,
                basePrice: parseFloat(newItem.basePrice),
                currentPrice: editingItemId ? parseFloat(newItem.currentPrice) : parseFloat(newItem.basePrice),
                unit: newItem.unit,
                image: newItem.image
            };

            const result = editingItemId
                ? await updateScrapItemAction(editingItemId, data)
                : await createScrapItemAction(data);

            if (result.success) {
                toast.success(editingItemId ? 'Item updated successfully' : 'Item created successfully');
                setIsDialogOpen(false);
                resetForm();
                loadData();
            } else {
                toast.error(result.error || `Failed to ${editingItemId ? 'update' : 'create'} item`);
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setNewItem({ name: '', categoryId: '', basePrice: '', currentPrice: '', unit: 'kg', image: '' });
        setEditingItemId(null);
    };

    const handleEditClick = (item: ScrapItemWithCategory) => {
        setEditingItemId(item.id);
        setNewItem({
            name: item.name,
            categoryId: item.categoryId,
            basePrice: item.basePrice.toString(),
            currentPrice: item.currentPrice.toString(),
            unit: item.unit,
            image: item.image || ''
        });
        setIsDialogOpen(true);
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            const result = await deleteScrapItemAction(id);
            if (result.success) {
                toast.success('Item deleted successfully');
                loadData();
            } else {
                toast.error('Failed to delete item');
            }
        } catch (error) {
            toast.error('An error occurred');
        }
    };

    // Mock Handlers for New Features
    const handleRollback = (price: number) => {
        toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
            loading: 'Rolling back price...',
            success: 'Price rolled back successfully!',
            error: 'Failed to rollback'
        });
        setHistoryItem(null);
    };

    const handleSchedule = async (data: ScheduledRateData) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success(`Rate change scheduled for ${data.effectiveDate.toLocaleDateString()}`);
    };

    // Filter Items
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Rate Management</h1>
                    <p className="text-gray-400">Manage daily scrap rates across cities.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none" onClick={() => resetForm()}>
                                <Plus className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white text-black">
                            <DialogHeader>
                                <DialogTitle>{editingItemId ? 'Edit Scrap Item' : 'Add New Scrap Item'}</DialogTitle>
                                <DialogDescription>
                                    {editingItemId ? 'Update the details of this scrap item.' : 'Add a new item to the pricing list.'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Item Name</Label>
                                    <Input id="name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required placeholder="e.g. Copper Wire" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                        id="category"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newItem.categoryId}
                                        onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Select a category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Base Price (₹)</Label>
                                        <Input id="price" type="number" step="0.01" value={newItem.basePrice} onChange={e => setNewItem({ ...newItem, basePrice: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="unit">Unit</Label>
                                        <Input id="unit" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="image">Image URL</Label>
                                    <Input
                                        id="image"
                                        value={newItem.image}
                                        onChange={e => setNewItem({ ...newItem, image: e.target.value })}
                                        placeholder="https://example.com/image.png"
                                    />
                                </div>
                                {editingItemId && (
                                    <div className="space-y-2">
                                        <Label htmlFor="currentPrice">Current Price (₹)</Label>
                                        <Input id="currentPrice" type="number" step="0.01" value={newItem.currentPrice} onChange={e => setNewItem({ ...newItem, currentPrice: e.target.value })} required />
                                    </div>
                                )}
                                <DialogFooter>
                                    <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : editingItemId ? 'Update Item' : 'Add Item'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search items..."
                            className="pl-9 bg-black/20 border-white/10 text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-[200px]">
                        <Select value={cityFilter} onValueChange={setCityFilter}>
                            <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                <SelectValue placeholder="City" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Global (All Cities)</SelectItem>
                                {CITIES.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No items found matching your filters.</div>
            ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-black/20">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Global Rate</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => (
                                <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell>
                                        <Avatar className="h-10 w-10 rounded-lg">
                                            <AvatarImage src={item.image || ''} alt={item.name} />
                                            <AvatarFallback className="rounded-lg bg-gray-800">{item.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium text-white">
                                        {item.name}
                                        {item.currentPrice > item.basePrice ? (
                                            <Badge variant="outline" className="ml-2 border-green-500/50 text-green-400 text-[10px] h-5">
                                                <ArrowUpRight className="h-3 w-3 mr-1" /> High Demand
                                            </Badge>
                                        ) : item.currentPrice < item.basePrice ? (
                                            <Badge variant="outline" className="ml-2 border-red-500/50 text-red-400 text-[10px] h-5">
                                                <ArrowDownRight className="h-3 w-3 mr-1" /> Surplus
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="ml-2 border-gray-700 text-gray-400 text-[10px] h-5">
                                                Stable
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-400">{item.category.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-white">{formatCurrency(item.currentPrice)}</span>
                                            <span className="text-xs text-gray-500">/ {item.unit}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-400 text-sm">
                                        Today, 10:30 AM
                                        <div className="text-xs text-gray-600">by Admin</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                                                onClick={() => setScheduleItem(item)}
                                                title="Schedule Change"
                                            >
                                                <Calendar className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                                                onClick={() => setHistoryItem(item)}
                                                title="View History"
                                            >
                                                <History className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-2 bg-white/10 text-white hover:bg-white/20"
                                                onClick={() => handleEditClick(item)}
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                                onClick={() => handleDeleteItem(item.id)}
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Modals */}
            {historyItem && (
                <HistoryModal
                    isOpen={!!historyItem}
                    onClose={() => setHistoryItem(null)}
                    itemName={historyItem.name}
                    currentPrice={historyItem.currentPrice}
                    history={[
                        { id: '1', price: historyItem.currentPrice, changedBy: 'You', changedAt: new Date().toISOString(), city: null, action: 'UPDATE' },
                        { id: '2', price: historyItem.basePrice, changedBy: 'System', changedAt: new Date(Date.now() - 86400000).toISOString(), city: null, action: 'UPDATE' }
                    ]}
                    onRollback={handleRollback}
                />
            )}

            {scheduleItem && (
                <ScheduleModal
                    isOpen={!!scheduleItem}
                    onClose={() => setScheduleItem(null)}
                    itemName={scheduleItem.name}
                    currentPrice={scheduleItem.currentPrice}
                    cities={CITIES}
                    onSchedule={handleSchedule}
                />
            )}
        </div>
    );
}
