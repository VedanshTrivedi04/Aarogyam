import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill, RotateCw, Edit2, X, Info, Clock, LayoutGrid, Weight,
  ArrowLeft, ShieldCheck, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCaregiverDevices, useDeviceInventory, useDeviceCompartments, useUpdateDeviceCompartments } from '@/hooks/useIoT';
import { useRescheduleCompartment } from '@/hooks/useCaregiver';
import { useUiStore } from '@/stores/ui.store';

const CompartmentCard = ({ comp, onEdit }) => (
  <Card className={`group rounded-[2.5rem] border-2 transition-all hover:shadow-elevation-3 ${comp.is_filled ? 'border-transparent bg-card' : 'border-dashed border-border/60 bg-muted/20'}`}>
    <CardContent className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg ${comp.is_filled ? 'bg-primary text-white shadow-primary/20' : 'bg-muted text-muted-foreground'}`}>
            {comp.compartment_number}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">Compartment {comp.compartment_number}</h3>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{comp.medication_name || comp.medication_name_display || 'Unassigned'}</p>
          </div>
        </div>
        <Badge variant={comp.is_filled ? 'success' : 'secondary'} className="h-6 px-3 rounded-full text-[9px] font-black uppercase tracking-wider">
          {comp.is_filled ? 'filled' : 'empty'}
        </Badge>
      </div>

      <div className="space-y-3 min-h-[120px]">
        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
          <Pill className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs font-bold text-foreground">{comp.medication_name || 'No medication mapped'}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Qty: {comp.total_pills ?? 0} • {comp.priority} • {comp.meal_dependency}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
          <Clock className="w-4 h-4 text-primary" />
          <p className="text-xs font-medium text-muted-foreground">Last filled: {comp.last_filled_at ? new Date(comp.last_filled_at).toLocaleDateString() : 'Never'}</p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Weight className="w-3.5 h-3.5" /> Remaining {comp.pills_remaining ?? 0}
        </div>
        <button onClick={() => onEdit(comp)} className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm">
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </CardContent>
  </Card>
);

export default function CompartmentManager() {
  const navigate = useNavigate();
  const { data: devices = [], isLoading: isLoadingDevices } = useCaregiverDevices();
  const activeDevice = devices[0];
  const deviceId = activeDevice?.id;
  const { data: inventory } = useDeviceInventory(deviceId);
  const { data: compartments = [], isLoading: isLoadingCompartments } = useDeviceCompartments(deviceId);
  const updateCompartments = useUpdateDeviceCompartments();
  const reschedule = useRescheduleCompartment();
  const activePatientId = useUiStore((s) => s.activePatientId);

  const liveCompartments = useMemo(() => {
    const source = compartments?.length ? compartments : inventory?.compartments || [];
    return source.map((comp) => ({
      ...comp,
      compartment_number: comp.compartment_number ?? comp.compartment,
      medication_name: comp.medication_name ?? comp.medication_name_display,
      is_filled: typeof comp.is_filled === 'boolean' ? comp.is_filled : (comp.pills_remaining ?? 0) > 0,
    }));
  }, [compartments, inventory]);

  const [editingComp, setEditingComp] = useState(null);
  const [formState, setFormState] = useState({ medication_name: '', priority: 'NORMAL', meal_dependency: 'NONE', scheduled_times: '', total_pills: 0, pills_remaining: 0, prescription: '' });

  const openEditor = (comp) => {
    setEditingComp(comp);
    setFormState({
      medication_name: comp.medication_name || comp.medication_name_display || '',
      priority: comp.priority || 'NORMAL',
      meal_dependency: comp.meal_dependency || 'NONE',
      scheduled_times: Array.isArray(comp.scheduled_times) ? comp.scheduled_times.join(', ') : '',
      total_pills: comp.total_pills ?? 0,
      pills_remaining: comp.pills_remaining ?? 0,
      prescription: comp.prescription || '',
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!activeDevice || !editingComp) return;

    const updated = liveCompartments.map((comp) => {
      if (String(comp.compartment_number) !== String(editingComp.compartment_number)) {
        return {
          compartment_number: comp.compartment_number,
          prescription: comp.prescription,
          scheduled_times: comp.scheduled_times || [],
          priority: comp.priority || 'NORMAL',
          meal_dependency: comp.meal_dependency || 'NONE',
          medication_name: comp.medication_name || comp.medication_name_display || '',
          total_pills: comp.total_pills ?? 0,
        };
      }

      return {
        compartment_number: comp.compartment_number,
        prescription: editingComp.prescription || comp.prescription,
        scheduled_times: formState.scheduled_times.split(',').map((time) => time.trim()).filter(Boolean),
        priority: formState.priority,
        meal_dependency: formState.meal_dependency,
        medication_name: formState.medication_name,
        total_pills: Number(formState.total_pills || 0),
      };
    });

    await updateCompartments.mutateAsync({ deviceId: activeDevice.id, compartments: updated });
    // If the scheduled times were updated, notify backend to reschedule compartment reminders
    const newTimes = formState.scheduled_times.split(',').map((t) => t.trim()).filter(Boolean);
    if (activePatientId && newTimes.length > 0) {
      try {
        await reschedule.mutateAsync({ patientId: activePatientId, deviceId: activeDevice.id, compartmentNumber: editingComp.compartment_number, payload: { times: newTimes } });
      } catch (err) {
        // swallow - update already applied to device mapping; backend reschedule may fail separately
        console.error('Reschedule failed', err);
      }
    }
    setEditingComp(null);
  };

  const totalWeight = inventory?.compartments?.reduce((sum, comp) => sum + (comp.pills_remaining || 0), 0) ?? 0;
  const filledCount = inventory?.filled_count ?? liveCompartments.filter((comp) => comp.is_filled).length;
  const totalCompartments = inventory?.total_compartments ?? liveCompartments.length;

  return (
    <div className="flex flex-col gap-8 py-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-1">
          <button onClick={() => navigate('/caregiver/home')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Dashboard</span>
          </button>
          <h2 className="text-3xl font-display font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            Device Logic Manager
          </h2>
          <p className="text-muted-foreground font-medium">Live compartment mapping for {activeDevice?.device_name || 'your linked dispenser'}.</p>
        </div>
        <Button onClick={() => navigate('/caregiver/fill')} className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs" disabled={!activeDevice}>
          <RotateCw className="w-4 h-4 mr-2" /> Sync with OLED
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(isLoadingDevices || isLoadingCompartments) ? (
          <div className="lg:col-span-4 text-sm text-muted-foreground p-6 bg-card rounded-2xl border border-border/50">Loading device compartments...</div>
        ) : liveCompartments.map((comp) => (
          <CompartmentCard key={comp.compartment_number} comp={comp} onEdit={openEditor} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[2.5rem]">
          <CardHeader className="border-b border-border/40 p-8 flex flex-row items-center justify-between bg-muted/10">
            <div>
              <h3 className="font-display font-bold text-xl">System Diagnostics</h3>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Live device and inventory data</p>
            </div>
            <Badge variant={activeDevice?.is_online ? 'success' : 'warning'} className="h-6 px-3 rounded-full text-[9px] font-black uppercase tracking-widest">{activeDevice?.is_online ? 'Connected' : 'Offline'}</Badge>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Total Pills', value: String(totalWeight), sub: 'Across compartments', icon: Weight },
                { label: 'Filled Slots', value: `${filledCount}/${totalCompartments}`, sub: 'Loaded compartments', icon: RotateCw },
                { label: 'Gate Security', value: activeDevice?.is_gate_locked ? 'Locked' : 'Unlocked', sub: 'Current lock state', icon: ShieldCheck },
              ].map((diag) => (
                <div key={diag.label} className="flex items-center gap-4 p-5 bg-card border border-border/50 rounded-2xl shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
                    <diag.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{diag.label}</p>
                    <p className="text-xl font-black text-foreground">{diag.value}</p>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-tighter">{diag.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] bg-primary/5 border-primary/20 border-dashed">
          <CardContent className="p-8 flex flex-col items-center text-center gap-5 h-full justify-center">
            <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-xl">
              <Info className="w-8 h-8 text-primary" />
            </div>
            <h4 className="font-display font-bold text-lg">AI Weight Estimator</h4>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Live inventory is read from the backend dispenser model. Use edit sync to keep the OLED and device mapping aligned.
            </p>
            <Button variant="outline" className="w-full h-11 rounded-xl border-primary/20 text-primary font-bold text-xs uppercase tracking-widest" onClick={() => navigate('/caregiver/settings')}>
              Open Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {editingComp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEditingComp(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-card w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-border/50">
              <div className="p-8 border-b border-border/40 flex justify-between items-center bg-primary text-white">
                <div>
                  <h2 className="text-2xl font-display font-extrabold tracking-tight">Modify Slot {editingComp.compartment_number}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Update backend mapping and OLED labels</p>
                </div>
                <button onClick={() => setEditingComp(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSave} className="p-8 flex flex-col gap-4">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Medicine Name<input value={formState.medication_name} onChange={(event) => setFormState((current) => ({ ...current, medication_name: event.target.value }))} className="mt-2 w-full rounded-xl border border-border/60 bg-background px-4 py-3" /></label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantity<input type="number" value={formState.total_pills} onChange={(event) => setFormState((current) => ({ ...current, total_pills: event.target.value }))} className="mt-2 w-full rounded-xl border border-border/60 bg-background px-4 py-3" /></label>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Priority<select value={formState.priority} onChange={(event) => setFormState((current) => ({ ...current, priority: event.target.value }))} className="mt-2 w-full rounded-xl border border-border/60 bg-background px-4 py-3"><option value="NORMAL">Normal</option><option value="HIGH">High</option></select></label>
                </div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meal Dependency<select value={formState.meal_dependency} onChange={(event) => setFormState((current) => ({ ...current, meal_dependency: event.target.value }))} className="mt-2 w-full rounded-xl border border-border/60 bg-background px-4 py-3"><option value="NONE">None</option><option value="AFTER_BREAKFAST">After Breakfast</option><option value="AFTER_LUNCH">After Lunch</option><option value="AFTER_DINNER">After Dinner</option></select></label>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scheduled Times<input value={formState.scheduled_times} onChange={(event) => setFormState((current) => ({ ...current, scheduled_times: event.target.value }))} placeholder="08:00, 20:00" className="mt-2 w-full rounded-xl border border-border/60 bg-background px-4 py-3" /></label>
                <div className="flex gap-4 mt-2">
                  <Button variant="outline" type="button" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs" onClick={() => setEditingComp(null)}>Discard</Button>
                  <Button type="submit" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20" disabled={updateCompartments.isPending}>
                    {updateCompartments.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Apply Logic
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
