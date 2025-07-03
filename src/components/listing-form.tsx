
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemCategories, ItemConditions, type Item, type ItemCategory, type ItemCondition, UserProfile, DeliveryOptions, type DeliveryOption, ShippingPayers, type ShippingPayer } from "@/lib/types";
import { PriceSuggestion } from "./price-suggestion";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, XCircle, Save, Sparkles, CheckCircle, RefreshCw, Video, Gem, Bike, Car, Truck, CarFront, Handshake, Lightbulb, MapPin, Phone } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { uploadImageAndGetURL, uploadVideoAndGetURL, createItemInFirestore, updateItemInFirestore } from "@/services/itemService";
import { getUserDocument } from "@/services/userService";
import Image from "next/image";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { TitleSuggestion } from "./title-suggestion";
import { DescriptionSuggestion } from "./description-suggestion";
import { LocationPicker } from "./location-picker";
import { CategorySuggestion } from "./category-suggestion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as DialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as DialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { LISTING_COST_IN_CREDITS } from "@/lib/config";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const MAX_VIDEO_SIZE_MB = 50;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/mov", "video/quicktime"];


const fileSchema = z
  .instanceof(File, { message: "Veuillez sélectionner un fichier image." })
  .refine(
    (file) => file.size <= MAX_FILE_SIZE_MB * 1024 * 1024,
    `La taille maximale du fichier est de ${MAX_FILE_SIZE_MB}MB.`
  )
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Formats acceptés : .jpg, .jpeg, .png, .webp, .gif."
  );

const listingFormSchema = z.object({
  name: z.string().min(10, "Le nom de l'article doit comporter au moins 10 caractères.").max(100),
  description: z.string().min(50, "La description doit comporter au moins 50 caractères.").max(500, "La description ne peut pas dépasser 500 caractères."),
  price: z.coerce.number().positive("Le prix doit être un nombre positif.").int("Le prix doit être un nombre entier pour FCFA."),
  category: z.enum(ItemCategories, { required_error: "Veuillez sélectionner une catégorie."}),
  condition: z.enum(ItemConditions, { required_error: "Veuillez sélectionner l'état de l'article."}),
  location: z.string().min(2, "Le lieu de l'article est requis.").max(100),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageFiles: z
    .array(fileSchema)
    .max(MAX_FILES, `Vous ne pouvez télécharger que ${MAX_FILES} images au maximum.`)
    .optional(),
  videoFile: z.instanceof(File, { message: "Veuillez sélectionner un fichier vidéo." })
    .refine((file) => file.size <= MAX_VIDEO_SIZE_MB * 1024 * 1024, `La taille maximale de la vidéo est de ${MAX_VIDEO_SIZE_MB}MB.`)
    .refine((file) => ACCEPTED_VIDEO_TYPES.includes(file.type), "Formats vidéo acceptés : .mp4, .webm, .mov.")
    .optional(),
  allowCall: z.boolean().default(false),
  allowWhatsApp: z.boolean().default(false),
  phoneNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  deliveryOptions: z.array(z.enum(DeliveryOptions)).optional(),
  shippingPayer: z.enum(ShippingPayers).optional(),
}).superRefine((data, ctx) => {
    if (data.allowCall && (!data.phoneNumber || data.phoneNumber.trim().length < 6)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Un numéro de téléphone valide est requis pour les appels.",
            path: ["phoneNumber"],
        });
    }
    if (data.allowWhatsApp && (!data.whatsappNumber || data.whatsappNumber.trim().length < 6)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Un numéro WhatsApp valide est requis.",
            path: ["whatsappNumber"],
        });
    }
});


type ListingFormValues = z.infer<typeof listingFormSchema>;

interface ListingFormProps {
  initialItemData?: Item | null;
}

const deliveryOptionIcons: Record<DeliveryOption, React.ElementType> = {
  'Moto': Bike,
  'Voiture': Car,
  'Pickup': Truck,
  'Taxi Baggage': CarFront,
  'Camion': Truck,
  'Remise en main propre': Handshake,
};

const WhatsAppIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
        <title>WhatsApp</title>
        <path d="M12.04 2.015c-5.524 0-10 4.478-10 10.002 0 1.75.45 3.415 1.256 4.863L2.07 22.07l5.247-1.372a9.962 9.962 0 0 0 4.72 1.21h.005c5.524 0 10-4.478 10-10.002s-4.476-10-10-10.002zM12.04 20.116h-.005a8.144 8.144 0 0 1-4.155-1.18l-.297-.176-3.085.807.82-3.013-.194-.31a8.14 0 0 1-1.27-4.382c0-4.512 3.655-8.17 8.168-8.17s8.167 3.657 8.167 8.17c0 4.513-3.655 8.17-8.168 8.17zm4.49-5.838c-.247-.124-1.46-.718-1.688-.802-.227-.082-.392-.123-.556.124-.164.246-.638.802-.782.966-.144.164-.288.184-.535.062-.247-.124-.96-.35-1.83-1.125-.678-.598-1.14-1.334-1.275-1.562-.134-.228-.014-.35.11-.474.11-.11.247-.288.37-.432.124-.144.164-.246.246-.41.082-.164.04-.308-.02-.432-.06-.124-.556-1.34-.763-1.838-.207-.498-.415-.43-.557-.438-.144-.008-.308-.008-.473-.008a.892.892 0 0 0-.64.308c-.207.228-.782.763-.782 1.854s.8 2.148.922 2.312c.124.164 1.562 2.38 3.79 3.326.54.232.96.37 1.284.473.535.164 1.02.144 1.406.082.43-.072 1.265-.515 1.442-1.012.178-.498.178-.926.124-1.012-.05-.082-.174-.134-.42-.258z"></path>
    </svg>
);


export function ListingForm({ initialItemData = null }: ListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { firebaseUser, authLoading } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState('');
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);

  const isEditMode = !!initialItemData?.id;

  const [imagePreviews, setImagePreviews] = useState<string[]>(initialItemData?.imageUrls || []);
  const [objectUrlToFileMap, setObjectUrlToFileMap] = useState<Map<string, File>>(new Map());

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [removeExistingVideo, setRemoveExistingVideo] = useState(false);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      name: initialItemData?.name || "",
      description: initialItemData?.description || "",
      price: initialItemData?.price || undefined,
      category: initialItemData?.category as ItemCategory | undefined,
      condition: initialItemData?.condition as ItemCondition | undefined,
      location: initialItemData?.location || "",
      latitude: initialItemData?.latitude,
      longitude: initialItemData?.longitude,
      imageFiles: [],
      videoFile: undefined,
      allowCall: initialItemData?.phoneNumber ? true : false,
      allowWhatsApp: initialItemData?.whatsappNumber ? true : false,
      phoneNumber: initialItemData?.phoneNumber || "",
      whatsappNumber: initialItemData?.whatsappNumber || "",
      deliveryOptions: initialItemData?.deliveryOptions || [],
      shippingPayer: initialItemData?.shippingPayer || undefined,
    },
  });
  
  const allowCall = form.watch('allowCall');
  const allowWhatsApp = form.watch('allowWhatsApp');

  useEffect(() => {
    if (firebaseUser) {
      setIsLoadingProfile(true);
      getUserDocument(firebaseUser.uid)
        .then(profile => setUserProfile(profile))
        .finally(() => setIsLoadingProfile(false));
    } else if (!authLoading) {
      setIsLoadingProfile(false);
      setUserProfile(null);
    }
  }, [firebaseUser, authLoading]);

  const selectedVideoFile = form.watch("videoFile");

  useEffect(() => {
    if (initialItemData) {
        form.reset({
            name: initialItemData.name,
            description: initialItemData.description,
            price: initialItemData.price || undefined,
            category: initialItemData.category as ItemCategory,
            condition: initialItemData.condition as ItemCondition,
            location: initialItemData.location || "",
            latitude: initialItemData.latitude,
            longitude: initialItemData.longitude,
            imageFiles: [],
            videoFile: undefined,
            allowCall: !!initialItemData.phoneNumber,
            allowWhatsApp: !!initialItemData.whatsappNumber,
            phoneNumber: initialItemData.phoneNumber || "",
            whatsappNumber: initialItemData.whatsappNumber || "",
            deliveryOptions: initialItemData.deliveryOptions || [],
            shippingPayer: initialItemData.shippingPayer || undefined,
        });
        setImagePreviews(initialItemData.imageUrls || []);
        setRemoveExistingVideo(false);
        setVideoPreview(null);
    }
  }, [initialItemData, form]);

  useEffect(() => {
    if (selectedVideoFile) {
        const url = URL.createObjectURL(selectedVideoFile);
        setVideoPreview(url);
        return () => URL.revokeObjectURL(url);
    } else {
        setVideoPreview(null);
    }
  }, [selectedVideoFile]);

  useEffect(() => {
    return () => {
      objectUrlToFileMap.forEach((_file, url) => URL.revokeObjectURL(url));
      imagePreviews.forEach(url => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [objectUrlToFileMap, imagePreviews]);

  const itemDescriptionForAISuggestions = form.watch("description");
  const currentCategoryForAISuggestions = form.watch("category");

  const handlePriceSuggested = (price: number) => {
    form.setValue("price", Math.round(price));
  };

  const handleTitleSuggested = (title: string) => {
    form.setValue("name", title, { shouldValidate: true });
    toast({
      title: "Titre Appliqué",
      description: `Le titre de l'annonce a été mis à jour.`,
    });
  };
  
  const handleDescriptionSuggested = (description: string) => {
    form.setValue("description", description, { shouldValidate: true });
  };
  
  const handleCategorySuggested = (category: ItemCategory) => {
    form.setValue("category", category, { shouldValidate: true });
  };

  const handleLocationSelected = useCallback(({ lat, lng, address }: { lat: number; lng: number; address: string; }) => {
    form.setValue('latitude', lat);
    form.setValue('longitude', lng);
    form.setValue('location', address, { shouldValidate: true });
  }, [form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesFromInput = Array.from(event.target.files || []);
    if (!filesFromInput.length) return;

    const currentRHFNewFiles = form.getValues("imageFiles") || [];
    
    const newFilesToAdd = filesFromInput.filter(
        f_input => !currentRHFNewFiles.some(
            f_rhf => f_rhf.name === f_input.name && f_rhf.size === f_input.size && f_rhf.lastModified === f_input.lastModified
        )
    );

    const existingHttpUrlsCount = imagePreviews.filter(url => url.startsWith("http")).length;
    const slotsAvailableForNew = MAX_FILES - existingHttpUrlsCount - currentRHFNewFiles.length;
    
    const filesToActuallyProcess = newFilesToAdd.slice(0, Math.max(0, slotsAvailableForNew));

    if (filesToActuallyProcess.length < newFilesToAdd.length) {
        toast({ description: `Limite de ${MAX_FILES} images atteinte. Certaines images n'ont pas été ajoutées.`});
    }
    if (!filesToActuallyProcess.length && newFilesToAdd.length > 0) {
        toast({ description: `Limite de ${MAX_FILES} images atteinte.`});
        return;
    }
    if (!filesToActuallyProcess.length) return;


    const updatedRHFNewFiles = [...currentRHFNewFiles, ...filesToActuallyProcess];
    form.setValue("imageFiles", updatedRHFNewFiles, { shouldValidate: true });

    const newObjectUrlsWithFileObjects: { objectUrl: string, file: File }[] = [];
    for (const file of filesToActuallyProcess) {
        newObjectUrlsWithFileObjects.push({ objectUrl: URL.createObjectURL(file), file });
    }

    setObjectUrlToFileMap(prevMap => {
        const newMap = new Map(prevMap);
        newObjectUrlsWithFileObjects.forEach(item => newMap.set(item.objectUrl, item.file));
        return newMap;
    });
    setImagePreviews(prev => [...prev, ...newObjectUrlsWithFileObjects.map(item => item.objectUrl)]);
  };

  const removeImage = (indexToRemove: number) => {
    const urlToRemove = imagePreviews[indexToRemove];
    
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));

    if (urlToRemove.startsWith("blob:")) {
      const fileToRemove = objectUrlToFileMap.get(urlToRemove);
      if (fileToRemove) {
        const currentRHFImageFiles = form.getValues("imageFiles") || [];
        form.setValue("imageFiles", currentRHFImageFiles.filter(f => f !== fileToRemove), { shouldValidate: true });
        
        setObjectUrlToFileMap(prevMap => {
          const newMap = new Map(prevMap);
          newMap.delete(urlToRemove);
          return newMap;
        });
      }
      URL.revokeObjectURL(urlToRemove);
    }
  };

  const handleVideoRemove = () => {
    if (selectedVideoFile) {
        form.setValue("videoFile", undefined, { shouldValidate: true });
    }
    if (initialItemData?.videoUrl) {
        setRemoveExistingVideo(true);
    }
  };

  async function onSubmit(values: ListingFormValues) {
    if (!isEditMode && (!values.imageFiles || values.imageFiles.length === 0)) {
      form.setError("imageFiles", {
        type: "manual",
        message: "Veuillez télécharger au moins une image pour votre annonce.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    if (!firebaseUser || !userProfile) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour effectuer cette action.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    if (!isEditMode) {
      const hasFreeListings = userProfile.freeListingsRemaining > 0;
      const hasEnoughCredits = userProfile.credits >= LISTING_COST_IN_CREDITS;

      if (!hasFreeListings && !hasEnoughCredits) {
        setShowCreditsDialog(true);
        setIsSubmitting(false);
        return;
      }
    }

    setUploadStatusText('');
    setUploadProgress(null);

    let finalImageUrls: string[] = [];
    const keptExistingUrls = imagePreviews.filter(url => url.startsWith("http"));
    finalImageUrls.push(...keptExistingUrls);

    const newFilesForUpload = values.imageFiles || [];

    try {
      if (newFilesForUpload.length > 0) {
        for (let i = 0; i < newFilesForUpload.length; i++) {
          const file = newFilesForUpload[i];
          setUploadStatusText(`Téléversement de l'image ${i + 1}/${newFilesForUpload.length}...`);
          const url = await uploadImageAndGetURL(file, firebaseUser.uid, (progress) => {
            setUploadProgress(progress);
          });
          finalImageUrls.push(url);
        }
        setUploadProgress(100);
      }
      
      let finalVideoUrl: string | undefined = initialItemData?.videoUrl;
      if (values.videoFile) {
        setUploadStatusText('Téléversement de la vidéo...');
        setUploadProgress(0);
        finalVideoUrl = await uploadVideoAndGetURL(values.videoFile, firebaseUser.uid, (progress) => {
          setUploadProgress(progress);
        });
        setUploadProgress(100); 
      } else if (removeExistingVideo) {
        finalVideoUrl = undefined;
      }
      
      setUploadStatusText("Sauvegarde de l'annonce...");
      setUploadProgress(null);
      
      const dataAiHintForImage = `${values.category} ${values.name.split(' ').slice(0,1).join('')}`.toLowerCase().replace(/[^a-z0-9\\s]/gi, '').substring(0,20);

      const commonItemData: Partial<Item> = { 
        name: values.name,
        description: values.description,
        price: Math.round(values.price),
        category: values.category,
        condition: values.condition,
        location: values.location || '',
        latitude: values.latitude,
        longitude: values.longitude,
        imageUrls: finalImageUrls, 
        videoUrl: finalVideoUrl,
        dataAiHint: dataAiHintForImage,
        phoneNumber: values.allowCall ? values.phoneNumber : undefined,
        whatsappNumber: values.allowWhatsApp ? values.whatsappNumber : undefined,
        deliveryOptions: values.deliveryOptions,
        shippingPayer: values.shippingPayer,
      };

      if (isEditMode && initialItemData?.id) {
        await updateItemInFirestore(initialItemData.id, commonItemData);
        toast({
          title: "Annonce mise à jour !",
          description: `Votre article "${values.name}" a été modifié avec succès.`,
        });
        router.push(`/items/${initialItemData.id}`);
      } else {
        const newItemFullData: Omit<Item, 'id' | 'postedDate' | 'lastUpdated'> = {
          ...(commonItemData as Omit<Item, 'id' | 'postedDate' | 'lastUpdated' | 'sellerId' | 'sellerName'>), 
          sellerId: firebaseUser.uid,
          sellerName: firebaseUser.displayName || firebaseUser.email || 'Vendeur Anonyme',
          imageUrls: finalImageUrls, // Use finalImageUrls which is now guaranteed to have at least one image for new items
        };
        const newItemId = await createItemInFirestore(newItemFullData);
        toast({
          title: "Annonce créée !",
          description: `Votre article "${values.name}" a été mis en vente avec succès.`,
        });
        router.push(`/items/${newItemId}`);
      }
    } catch (error: any) {
      console.error(`Échec de ${isEditMode ? "la mise à jour" : "la création"} de l'annonce:`, error);
      toast({
        title: "Erreur de sauvegarde",
        description: `Échec de ${isEditMode ? "la mise à jour" : "la création"} de l'annonce. ${error.message || 'Veuillez réessayer.'}`,
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
        setUploadStatusText('');
        setUploadProgress(null);
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!firebaseUser && !authLoading) {
     return (
        <div className="text-center py-10 p-6 border rounded-lg shadow-sm bg-card">
            <h2 className="text-2xl font-semibold mb-2">Connexion requise</h2>
            <p className="text-muted-foreground mb-4">Vous devez être connecté pour {isEditMode ? "modifier" : "lister"} un article.</p>
            <Link href={`/auth/signin?redirect=${isEditMode ? `/items/${initialItemData?.id}/edit` : '/sell'}`}>
                <Button>Se connecter</Button>
            </Link>
        </div>
     )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <AlertDialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitle>Crédits Insuffisants</DialogTitle>
            <DialogDescription>
              Vous avez utilisé toutes vos annonces gratuites. Pour continuer, vous devez acheter des crédits.
            </DialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Plus tard</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/credits')}>
              <Gem className="mr-2 h-4 w-4" /> Acheter des crédits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6 border rounded-lg shadow-sm bg-card">
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Décrivez votre article en détail..."
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DescriptionSuggestion 
            itemDescription={itemDescriptionForAISuggestions}
            onDescriptionSuggested={handleDescriptionSuggested}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de l'article</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Veste en cuir vintage" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <TitleSuggestion
            itemDescription={itemDescriptionForAISuggestions}
            onTitleSuggested={handleTitleSuggested}
          />

            <div className="grid sm:grid-cols-2 gap-8">
              <FormField
                control={form.control} name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ItemCategories.map((category) => ( <SelectItem key={category} value={category}> {category} </SelectItem> ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <CategorySuggestion
                      itemDescription={itemDescriptionForAISuggestions}
                      onCategorySuggested={handleCategorySuggested}
                      currentCategory={currentCategoryForAISuggestions}
                    />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="condition" render={({ field }) => (
                  <FormItem>
                    <FormLabel>État</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez l'état de l'article" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ItemConditions.map((conditionValue) => ( <SelectItem key={conditionValue} value={conditionValue} className="capitalize">{conditionValue.charAt(0).toUpperCase() + conditionValue.slice(1)}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
            
            <FormField
                control={form.control}
                name="price"
                render={({ field: { onChange, onBlur, value, name, ref } }) => (
                  <FormItem>
                    <FormLabel>Prix (FCFA)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" step="1" placeholder="ex: 25000" name={name} ref={ref} onBlur={onBlur}
                        value={value === undefined || isNaN(Number(value)) ? '' : value.toString()}
                        onChange={e => {
                          const stringValue = e.target.value;
                          if (stringValue === "") { onChange(undefined); } else { const num = parseFloat(stringValue); onChange(isNaN(num) ? undefined : num); }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <PriceSuggestion
                itemDescription={itemDescriptionForAISuggestions}
                onPriceSuggested={handlePriceSuggested}
            />

            <LocationPicker 
              initialPosition={
                initialItemData?.latitude && initialItemData.longitude
                  ? { lat: initialItemData.latitude, lng: initialItemData.longitude }
                  : null
              }
              onLocationSelect={handleLocationSelected}
            />
             <Alert className="!mt-4 border-primary/20 bg-primary/5">
                <MapPin className="h-4 w-4 text-primary" />
                <AlertTitle className="font-bold text-primary">Pourquoi un lieu précis est-il important ?</AlertTitle>
                <AlertDescription>
                Indiquer un lieu exact permet aux acheteurs proches de vous de trouver votre article plus facilement, notamment sur la carte. Cela augmente la confiance et facilite grandement l'organisation de la livraison.
                </AlertDescription>
            </Alert>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <FormLabel className="text-base">Méthodes de contact alternatives</FormLabel>
                <FormDescription>
                    Choisissez comment les acheteurs peuvent vous contacter, en plus de la messagerie interne.
                </FormDescription>
                <div className="space-y-4 pt-2">
                    <FormField
                        control={form.control}
                        name="allowCall"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="flex items-center gap-2 cursor-pointer">
                                        <Phone className="h-4 w-4" /> Appel téléphonique
                                    </FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                    {allowCall && (
                        <div className="pl-8">
                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Numéro de téléphone</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="ex: 77 123 45 67" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        </div>
                    )}
                    <FormField
                        control={form.control}
                        name="allowWhatsApp"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                     <FormLabel className="flex items-center gap-2 cursor-pointer">
                                       <WhatsAppIcon /> WhatsApp
                                    </FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                     {allowWhatsApp && (
                        <div className="pl-8">
                        <FormField
                            control={form.control}
                            name="whatsappNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Numéro WhatsApp</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="ex: +221 77 123 45 67" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        </div>
                    )}
                </div>
            </div>

            <FormField
              control={form.control}
              name="deliveryOptions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Options de livraison</FormLabel>
                    <FormDescription>
                      Sélectionnez les moyens par lesquels cet article peut être transporté.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {DeliveryOptions.map((option) => {
                      const Icon = deliveryOptionIcons[option];
                      return (
                        <FormField
                          key={option}
                          control={form.control}
                          name="deliveryOptions"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={option}
                                className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 has-[:checked]:border-primary transition-colors"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), option])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== option
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center gap-2 cursor-pointer w-full">
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                  {option}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="shippingPayer"
                render={({ field }) => (
                <FormItem className="space-y-3 rounded-lg border p-4">
                    <FormLabel className="text-base">Qui paie la livraison ?</FormLabel>
                    <FormControl>
                    <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2"
                    >
                        {ShippingPayers.map((payer) => (
                            <FormItem key={payer} className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value={payer} id={`payer-${payer}`} />
                                </FormControl>
                                <FormLabel htmlFor={`payer-${payer}`} className="font-normal cursor-pointer">
                                    {payer}
                                </FormLabel>
                            </FormItem>
                        ))}
                    </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />


          <FormField
            control={form.control}
            name="imageFiles"
            render={({ fieldState }) => (
              <FormItem>
                <FormLabel>Images de l'article (Max {MAX_FILES})</FormLabel>
                
                <Alert className="bg-primary/5 border-primary/20 text-foreground !mt-4">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <AlertTitle className="font-bold text-primary">Conseils pour de superbes photos et vidéos</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 mt-2 text-sm text-muted-foreground">
                      <li><strong>Lumière Naturelle :</strong> Privilégiez la lumière du jour et évitez les ombres portées pour des couleurs fidèles.</li>
                      <li><strong>Fond Neutre :</strong> Un arrière-plan simple (un mur blanc, un drap uni) mettra votre article en valeur.</li>
                      <li><strong>Plusieurs Angles :</strong> Photographiez l'article sous tous ses angles (avant, arrière, côtés, intérieur).</li>
                      <li><strong>Détails et Défauts :</strong> Montrez les gros plans des détails importants et n'hésitez pas à filmer les éventuels défauts pour plus de transparence.</li>
                      <li><strong>Vidéo en Action :</strong> Si possible, montrez l'article en cours d'utilisation dans une courte vidéo.</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <FormControl>
                  <Input
                    type="file"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    disabled={isSubmitting || imagePreviews.length >= MAX_FILES}
                  />
                </FormControl>
                {(imagePreviews.length >= MAX_FILES) && (
                    <FormDescription className="text-destructive">
                        Vous avez atteint la limite de {MAX_FILES} images.
                    </FormDescription>
                )}
                 {imagePreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {imagePreviews.map((previewUrl, index) => (
                        <div key={previewUrl} className="relative group aspect-square">
                            <Image
                                src={previewUrl}
                                alt={`Aperçu ${index + 1}`}
                                fill
                                className="object-cover rounded-md border"
                            />
                            <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100 transition-opacity z-10"
                            onClick={() => removeImage(index)}
                            disabled={isSubmitting}
                            >
                            <XCircle className="h-4 w-4" />
                            <span className="sr-only">Supprimer l'image {index + 1}</span>
                            </Button>
                        </div>
                        ))}
                    </div>
                )}
                {imagePreviews.length === 0 && !isEditMode && (
                     <div className="mt-2 h-20 w-full bg-muted rounded-md flex items-center justify-center border border-dashed border-destructive">
                        <UploadCloud className="h-8 w-8 text-destructive" />
                      </div>
                )}
                <FormDescription>
                  Téléchargez jusqu'à {MAX_FILES} images (Max {MAX_FILE_SIZE_MB}MB chacune). Formats: PNG, JPG, GIF, WEBP.
                  {isEditMode && " Les images existantes seront conservées si vous n'en téléchargez pas de nouvelles. Les nouvelles images s'ajouteront ou remplaceront selon votre sélection."}
                </FormDescription>
                <FormMessage>{fieldState.error?.message || (form.formState.errors.imageFiles as any)?.message}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="videoFile"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Vidéo de l'article (Optionnel, Max {MAX_VIDEO_SIZE_MB}MB)</FormLabel>
                    <FormControl>
                        <Input
                            type="file"
                            accept="video/mp4,video/webm,video/mov,video/quicktime"
                            onChange={(e) => field.onChange(e.target.files?.[0])}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            disabled={isSubmitting}
                        />
                    </FormControl>
                    <FormMessage />
                    
                    {(videoPreview || (initialItemData?.videoUrl && !removeExistingVideo)) && (
                        <div className="mt-4 relative w-full max-w-sm aspect-video">
                            <video 
                                key={videoPreview || initialItemData?.videoUrl}
                                src={videoPreview || initialItemData?.videoUrl} 
                                controls 
                                className="w-full h-full object-contain rounded-md border bg-black"
                            >
                                Votre navigateur ne supporte pas la balise vidéo.
                            </video>
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-80 hover:opacity-100 transition-opacity z-10"
                                onClick={handleVideoRemove}
                                disabled={isSubmitting}
                            >
                                <XCircle className="h-5 w-5" />
                                <span className="sr-only">Supprimer la vidéo</span>
                            </Button>
                        </div>
                    )}
                    
                    <FormDescription>
                        Les annonces avec au moins une courte vidéo se vendent plus rapidement.
                    </FormDescription>
                </FormItem>
            )}
           />

          {isSubmitting && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-center text-sm font-medium text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadStatusText || "Soumission de l'annonce..."}
              </div>
              {uploadProgress !== null && (
                <div className="flex items-center gap-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <span className="text-sm font-mono text-muted-foreground min-w-[4ch]">
                    {`${Math.round(uploadProgress)}%`}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full font-bold" disabled={isSubmitting || authLoading || isLoadingProfile}>
            {isSubmitting || isLoadingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? <Save className="mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4" />) }
            {isEditMode ? "Sauvegarder les modifications" : "Créer l'annonce"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
