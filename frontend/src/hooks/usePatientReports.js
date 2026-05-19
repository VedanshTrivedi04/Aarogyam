import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { qk, STALE } from './qk';

export function useAdherenceTimeline(days = 30, patientId = null) {
  return useQuery({
    queryKey: [qk.adherence.heatmap(patientId || 'me'), days],
    queryFn: async () => {
      const url = patientId ? `/caregivers/patients/${patientId}/adherence/timeline/` : '/adherence/timeline/';
      const res = await axiosInstance.get(url, { params: { days } });
      return res.data?.data ?? res.data;
    },
    staleTime: STALE.AI_INSIGHTS,
  });
}

export function useAdherenceSummary(days = 30, patientId = null) {
  return useQuery({
    queryKey: [qk.adherence.rate(patientId || 'me'), days],
    queryFn: async () => {
      const url = patientId ? `/caregivers/patients/${patientId}/adherence/summary/` : '/adherence/summary/';
      const res = await axiosInstance.get(url, { params: { days } });
      return res.data?.data ?? res.data;
    },
    staleTime: STALE.ADHERENCE_RATE,
  });
}

export function useMedicationBreakdown(days = 30, patientId = null) {
  return useQuery({
    queryKey: ['adherence', 'medication-breakdown', patientId || 'me', days],
    queryFn: async () => {
      const url = patientId ? `/caregivers/patients/${patientId}/adherence/medications/` : '/adherence/medications/';
      const res = await axiosInstance.get(url, { params: { days } });
      return res.data?.data ?? res.data;
    },
    staleTime: STALE.AI_INSIGHTS,
  });
}

export function useExportAdherenceReport(patientId = null) {
  return async ({ days = 30, format = 'pdf' } = {}) => {
    const url = patientId ? `/caregivers/patients/${patientId}/adherence/export/` : '/adherence/export/';
    const res = await axiosInstance.get(url, {
      params: { days, format },
      responseType: 'blob',
    });
    return res;
  };
}
