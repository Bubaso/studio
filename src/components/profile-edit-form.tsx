
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, UserCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { UserProfile } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { uploadAvatarAndGetURL, updateUserProfile } from "@/services/userService";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const MAX_AVATAR_SIZE_MB = 2;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const profileEditFormSchema = z.object({
  name: z.string().min(2, "Le nom doit comporter au moins 2 caractères.").max(50, "Le nom ne peut pas dépasser 50 caractères."),
  location: z.string().max(100, "Le lieu ne peut pas dépasser 100 caractères.").optional(),
  avatarFile: z
    .instanceof(File, { message: "Veuillez sélectionner un fichier image." })
    .refine(
      (file) => file.size <= MAX_AVATAR_SIZE_MB * 1024 * 1024,
      `La taille maximale de l'avatar est de ${MAX_AVATAR_SIZE_MB}MB.`
    )
    .refine(
      (file) => ACCEPTED_AVATAR_TYPES.includes(file.type),
      "Formats acceptés : .jpg, .jpeg, .png, .webp, .gif."
    )
    .optional(),
});

type ProfileEditFormValues = z.infer<typeof profileEditFormSchema>;

interface ProfileEditFormProps {
  currentUserProfile: UserProfile;
}

export function ProfileEditForm({ currentUserProfile }: ProfileEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUserProfile.avatarUrl);

  const form = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditFormSchema),
    defaultValues: {
      name: currentUserProfile.name || "",
      location: currentUserProfile.location || "",
      avatarFile: undefined,
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("avatarFile", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    form.setValue("avatarFile", undefined, { shouldValidate: true });
    setAvatarPreview(null); // Or set to a default placeholder, or keep old one for now
    // If you want to revert to the original avatar after selecting a new one and then removing:
    // setAvatarPreview(currentUserProfile.avatarUrl);
  };

  useEffect(() => {
    // Clean up Object URL
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  async function onSubmit(values: ProfileEditFormValues) {
    if (!auth.currentUser || auth.currentUser.uid !== currentUserProfile.uid) {
      toast({ title: "Erreur", description: "Utilisateur non authentifié ou invalide.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      let newAvatarUrl: string | undefined = undefined;
      if (values.avatarFile) {
        newAvatarUrl = await uploadAvatarAndGetURL(values.avatarFile, currentUserProfile.uid);
      }

      const updateData: { name?: string; location?: string; avatarUrl?: string } = {};
      if (values.name !== currentUserProfile.name) updateData.name = values.name;
      if (values.location !== currentUserProfile.location) updateData.location = values.location;
      if (newAvatarUrl) updateData.avatarUrl = newAvatarUrl;
      // If avatar was removed and no new one, we might want to set a default or remove it
      // For now, if avatarFile is undefined but avatarPreview was cleared, it means remove/reset.
      // If user explicitly wants to REMOVE avatar (set to default), that logic needs more care.
      // Current setup: if newAvatarUrl is undefined, existing avatar in DB isn't touched unless explicitly cleared in DB.
      // If avatarPreview is null AND values.avatarFile is undefined, it means user cleared preview of NEW file.
      // If we want to support "removing" avatar to go back to a default, `updateUserProfile` would need a flag.
      // For simplicity, this form only updates if a NEW avatar is uploaded.

      await updateUserProfile(currentUserProfile.uid, updateData);

      toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées." });
      router.push("/profile"); // Or router.refresh() if staying on the same page and data needs to update
      router.refresh(); // To make sure layout re-fetches current user
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Erreur", description: "Échec de la mise à jour du profil.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Modifier votre profil</CardTitle>
        <CardDescription>Mettez à jour vos informations personnelles et votre avatar.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="avatarFile"
              render={() => (
                <FormItem className="flex flex-col items-center">
                  <FormLabel>Avatar</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Avatar className="w-32 h-32 text-lg border-2 border-muted shadow-md">
                        <AvatarImage src={avatarPreview || undefined} alt={currentUserProfile.name || "Avatar"} data-ai-hint="profil personne" />
                        <AvatarFallback>
                            {currentUserProfile.name ? currentUserProfile.name.substring(0,2).toUpperCase() : <UserCircle className="w-16 h-16" />}
                        </AvatarFallback>
                      </Avatar>
                      {avatarPreview && avatarPreview !== currentUserProfile.avatarUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                          onClick={removeAvatar}
                        >
                          <XCircle className="h-5 w-5" />
                          <span className="sr-only">Supprimer le nouvel avatar</span>
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <Input
                    type="file"
                    accept={ACCEPTED_AVATAR_TYPES.join(",")}
                    onChange={handleFileChange}
                    className="mt-2 block w-full max-w-xs text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  <FormDescription className="text-center mt-1">
                    Max {MAX_AVATAR_SIZE_MB}MB. Formats: JPG, PNG, GIF, WEBP.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input placeholder="Votre nom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu (Optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Dakar, Sénégal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les modifications
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Dummy components for Card to avoid import errors if they don't exist at this path.
// Replace with actual imports from '@/components/ui/card'
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={cn("border bg-card text-card-foreground rounded-lg", className)}>{children}</div>;
const CardHeader = ({ children }: { children: React.ReactNode }) => <div className="p-6 flex flex-col space-y-1.5">{children}</div>;
const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => <h3 className={cn("font-semibold leading-none tracking-tight", className)}>{children}</h3>;
const CardDescription = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;
const CardContent = ({ children }: { children: React.ReactNode }) => <div className="p-6 pt-0">{children}</div>;
const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');
