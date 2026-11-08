import pb from '@/lib/pocketbase/client'
import {
  UserBasicProfile,
  ProfileBiomarker,
  ProfileCondition,
  ProfileAllergy,
  ProfileVaccination,
  ProfileEvent,
  ProfileGenetics,
  ProfileCareProvider,
  ProfileLifestyle,
} from '@/types'
import { loadDashboardPreferences, saveDashboardPreferences } from './preferences'

export const profileService = {
  // 1. Basic Info
  async getBasicProfile(userId?: string): Promise<UserBasicProfile> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) throw new Error('Usuário não autenticado')

    const user = await pb.collection('users').getOne(targetId)
    const prefs = await loadDashboardPreferences()

    return {
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      birthDate: prefs.birthDate || '',
      gender: prefs.gender || '',
      bloodType: prefs.bloodType || '',
      heightCm: prefs.heightCm,
      weightKg: prefs.weightKg,
      contactNotes: prefs.contactNotes || '',
    }
  },

  async updateBasicProfile(data: Partial<UserBasicProfile>, userId?: string): Promise<void> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) throw new Error('Usuário não autenticado')

    // Atualiza nome/telefone em users
    const userUpdates: Record<string, unknown> = {}
    if (data.name !== undefined) userUpdates.name = data.name
    if (data.phone !== undefined) userUpdates.phone = data.phone
    if (Object.keys(userUpdates).length > 0) {
      await pb.collection('users').update(targetId, userUpdates)
    }

    // Atualiza preferências adicionais
    const currentPrefs = await loadDashboardPreferences()
    await saveDashboardPreferences({
      ...currentPrefs,
      birthDate: data.birthDate !== undefined ? data.birthDate : currentPrefs.birthDate,
      gender: data.gender !== undefined ? data.gender : currentPrefs.gender,
      bloodType: data.bloodType !== undefined ? data.bloodType : currentPrefs.bloodType,
      heightCm: data.heightCm !== undefined ? data.heightCm : currentPrefs.heightCm,
      weightKg: data.weightKg !== undefined ? data.weightKg : currentPrefs.weightKg,
      contactNotes: data.contactNotes !== undefined ? data.contactNotes : currentPrefs.contactNotes,
    })
  },

  // 2. Biomarkers
  async getBiomarkers(userId?: string): Promise<ProfileBiomarker[]> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) return []
    return (await pb.collection('profile_biomarkers').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-date,-created',
    })) as unknown as ProfileBiomarker[]
  },

  async createBiomarker(
    data: Omit<ProfileBiomarker, 'id' | 'user' | 'created' | 'updated'>,
  ): Promise<ProfileBiomarker> {
    const user = pb.authStore.record?.id
    if (!user) throw new Error('Usuário não autenticado')
    return (await pb.collection('profile_biomarkers').create({
      ...data,
      user,
    })) as unknown as ProfileBiomarker
  },

  async deleteBiomarker(id: string): Promise<void> {
    await pb.collection('profile_biomarkers').delete(id)
  },

  // 3. Conditions & Injuries
  async getConditions(userId?: string): Promise<ProfileCondition[]> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) return []
    return (await pb.collection('profile_conditions').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-date,-created',
    })) as unknown as ProfileCondition[]
  },

  async createCondition(
    data: Omit<ProfileCondition, 'id' | 'user' | 'created' | 'updated'>,
  ): Promise<ProfileCondition> {
    const user = pb.authStore.record?.id
    if (!user) throw new Error('Usuário não autenticado')
    return (await pb.collection('profile_conditions').create({
      ...data,
      user,
    })) as unknown as ProfileCondition
  },

  async deleteCondition(id: string): Promise<void> {
    await pb.collection('profile_conditions').delete(id)
  },

  // 4. Allergies
  async getAllergies(userId?: string): Promise<ProfileAllergy[]> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) return []
    return (await pb.collection('profile_allergies').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-created',
    })) as unknown as ProfileAllergy[]
  },

  async createAllergy(
    data: Omit<ProfileAllergy, 'id' | 'user' | 'created' | 'updated'>,
  ): Promise<ProfileAllergy> {
    const user = pb.authStore.record?.id
    if (!user) throw new Error('Usuário não autenticado')
    return (await pb.collection('profile_allergies').create({
      ...data,
      user,
    })) as unknown as ProfileAllergy
  },

  async deleteAllergy(id: string): Promise<void> {
    await pb.collection('profile_allergies').delete(id)
  },

  // 5. Vaccinations
  async getVaccinations(userId?: string): Promise<ProfileVaccination[]> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) return []
    return (await pb.collection('profile_vaccinations').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-date,-created',
    })) as unknown as ProfileVaccination[]
  },

  async createVaccination(
    data: Omit<ProfileVaccination, 'id' | 'user' | 'created' | 'updated'>,
  ): Promise<ProfileVaccination> {
    const user = pb.authStore.record?.id
    if (!user) throw new Error('Usuário não autenticado')
    return (await pb.collection('profile_vaccinations').create({
      ...data,
      user,
    })) as unknown as ProfileVaccination
  },

  async deleteVaccination(id: string): Promise<void> {
    await pb.collection('profile_vaccinations').delete(id)
  },

  // 6. Events
  async getEvents(userId?: string): Promise<ProfileEvent[]> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) return []
    return (await pb.collection('profile_events').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-date,-created',
    })) as unknown as ProfileEvent[]
  },

  async createEvent(
    data: Omit<ProfileEvent, 'id' | 'user' | 'created' | 'updated'>,
  ): Promise<ProfileEvent> {
    const user = pb.authStore.record?.id
    if (!user) throw new Error('Usuário não autenticado')
    return (await pb.collection('profile_events').create({
      ...data,
      user,
    })) as unknown as ProfileEvent
  },

  async deleteEvent(id: string): Promise<void> {
    await pb.collection('profile_events').delete(id)
  },

  // 7. Genetics
  async getGenetics(userId?: string): Promise<ProfileGenetics[]> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) return []
    return (await pb.collection('profile_genetics').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-created',
    })) as unknown as ProfileGenetics[]
  },

  async createGenetics(
    data: Omit<ProfileGenetics, 'id' | 'user' | 'created' | 'updated'>,
  ): Promise<ProfileGenetics> {
    const user = pb.authStore.record?.id
    if (!user) throw new Error('Usuário não autenticado')
    return (await pb.collection('profile_genetics').create({
      ...data,
      user,
    })) as unknown as ProfileGenetics
  },

  async deleteGenetics(id: string): Promise<void> {
    await pb.collection('profile_genetics').delete(id)
  },

  // 8. Care Providers
  async getCareProviders(userId?: string): Promise<ProfileCareProvider[]> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) return []
    return (await pb.collection('profile_care_providers').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-is_primary,-created',
    })) as unknown as ProfileCareProvider[]
  },

  async createCareProvider(
    data: Omit<ProfileCareProvider, 'id' | 'user' | 'created' | 'updated'>,
  ): Promise<ProfileCareProvider> {
    const user = pb.authStore.record?.id
    if (!user) throw new Error('Usuário não autenticado')
    return (await pb.collection('profile_care_providers').create({
      ...data,
      user,
    })) as unknown as ProfileCareProvider
  },

  async deleteCareProvider(id: string): Promise<void> {
    await pb.collection('profile_care_providers').delete(id)
  },

  // 9. Lifestyle
  async getLifestyle(userId?: string): Promise<ProfileLifestyle | null> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) return null
    try {
      const rec = await pb.collection('profile_lifestyle').getFirstListItem(`user = '${targetId}'`)
      return rec as unknown as ProfileLifestyle
    } catch (_) {
      return null
    }
  },

  async saveLifestyle(
    data: Partial<Omit<ProfileLifestyle, 'id' | 'user' | 'created' | 'updated'>>,
    userId?: string,
  ): Promise<ProfileLifestyle> {
    const targetId = userId || pb.authStore.record?.id
    if (!targetId) throw new Error('Usuário não autenticado')

    try {
      const existing = await pb
        .collection('profile_lifestyle')
        .getFirstListItem(`user = '${targetId}'`)
      const updated = await pb.collection('profile_lifestyle').update(existing.id, data)
      return updated as unknown as ProfileLifestyle
    } catch (err: any) {
      if (err?.status === 404) {
        const created = await pb.collection('profile_lifestyle').create({
          ...data,
          user: targetId,
        })
        return created as unknown as ProfileLifestyle
      }
      throw err
    }
  },
}
