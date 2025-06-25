
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
import { ItemCategories, ItemConditions, type Item, type ItemCategory, type ItemCondition } from "@/lib/types";
import { PriceSuggestion } from "./price-suggestion";
import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, XCircle, Save, Sparkles, CheckCircle, RefreshCw, Video } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { uploadImageAndGetURL, uploadVideoAndGetURL, createItemInFirestore, updateItemInFirestore } from "@/services/itemService";
import { suggestItemCategory } from "@/ai/flows/suggest-item-category-flow";
import { suggestDescription } from "@/ai/flows/suggest-description-flow";
import Image from "next/image";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { TitleSuggestion } from "./title-suggestion";

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
  name: z.string().min(3, "Le nom de l'article doit comporter au moins 3 caractères.").max(100),
  description: z.string().min(20, "La description doit comporter au moins 20 caractères.").max(500, "La description ne peut pas dépasser 500 caractères."),
  price: z.coerce.number().positive("Le prix doit être un nombre positif.").int("Le prix doit être un nombre entier pour FCFA."),
  category: z.enum(ItemCategories, { required_error: "Veuillez sélectionner une catégorie."}),
  condition: z.enum(ItemConditions, { required_error: "Veuillez sélectionner l'état de l'article."}),
  location: z.string().min(2, "Le lieu doit comporter au moins 2 caractères.").max(100).optional(),
  imageFiles: z
    .array(fileSchema)
    .max(MAX_FILES, `Vous ne pouvez télécharger que ${MAX_FILES} images au maximum.`)
    .optional(),
  videoFile: z.instanceof(File, { message: "Veuillez sélectionner un fichier vidéo." })
    .refine((file) => file.size <= MAX_VIDEO_SIZE_MB * 1024 * 1024, `La taille maximale de la vidéo est de ${MAX_VIDEO_SIZE_MB}MB.`)
    .refine((file) => ACCEPTED_VIDEO_TYPES.includes(file.type), "Formats vidéo acceptés : .mp4, .webm, .mov.")
    .optional(),
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

interface ListingFormProps {
  initialItemData?: Item | null;
}

export function ListingForm({ initialItemData = null }: ListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState<{ category: ItemCategory; confidence: number } | null>(null);
  const [isCategorySuggestionApplied, setIsCategorySuggestionApplied] = useState(false);

  const [descriptionSuggestion, setDescriptionSuggestion] = useState<string | null>(null);
  const [isSuggestingDescription, setIsSuggestingDescription] = useState(false);
  const [isDescriptionSuggestionApplied, setIsDescriptionSuggestionApplied] = useState(false);
  const [descriptionRegenerationTrigger, setDescriptionRegenerationTrigger] = useState(0);

  const isEditMode = !!initialItemData?.id;

  const [imagePreviews, setImagePreviews] = useState<string[]>(initialItemData?.imageUrls || []);
  const [objectUrlToFileMap, setObjectUrlToFileMap] = useState<Map<string, File>>(new Map());

  // Video state management
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
      imageFiles: [],
      videoFile: undefined,
    },
  });
  
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
            imageFiles: [],
            videoFile: undefined,
        });
        setImagePreviews(initialItemData.imageUrls || []);
        setRemoveExistingVideo(false);
        setVideoPreview(null); // Clear blob preview
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => {
      unsubscribe();
      objectUrlToFileMap.forEach((_file, url) => URL.revokeObjectURL(url));
      imagePreviews.forEach(url => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [objectUrlToFileMap, imagePreviews]);

  const itemDescriptionForAISuggestions = form.watch("description");

  useEffect(() => {
    if (itemDescriptionForAISuggestions && itemDescriptionForAISuggestions.length > 20 && !isCategorySuggestionApplied && !isEditMode) {
      const handler = setTimeout(async () => {
        setIsSuggestingCategory(true);
        try {
          const suggestion = await suggestItemCategory({ itemDescription: itemDescriptionForAISuggestions });
          if (suggestion.suggestedCategory && ItemCategories.includes(suggestion.suggestedCategory as ItemCategory)) {
            setCategorySuggestion({ category: suggestion.suggestedCategory as ItemCategory, confidence: suggestion.confidence });
          } else {
            setCategorySuggestion(null);
          }
        } catch (error) {
          console.error("Error suggesting category:", error);
          setCategorySuggestion(null);
        } finally {
          setIsSuggestingCategory(false);
        }
      }, 1000);

      return () => clearTimeout(handler);
    } else {
      setCategorySuggestion(null);
    }
  }, [itemDescriptionForAISuggestions, isCategorySuggestionApplied, isEditMode]);

  useEffect(() => {
    if (itemDescriptionForAISuggestions && itemDescriptionForAISuggestions.length > 25 && !isDescriptionSuggestionApplied && !isEditMode) {
      const handler = setTimeout(async () => {
        setIsSuggestingDescription(true);
        try {
          const suggestionResult = await suggestDescription({ itemDescription: itemDescriptionForAISuggestions });
          if (suggestionResult.suggestedDescription && suggestionResult.suggestedDescription !== itemDescriptionForAISuggestions) {
            setDescriptionSuggestion(suggestionResult.suggestedDescription);
          } else {
            setDescriptionSuggestion(null);
          }
        } catch (error) {
          console.error("Error suggesting description:", error);
          setDescriptionSuggestion(null);
        } finally {
          setIsSuggestingDescription(false);
        }
      }, 1500);

      return () => clearTimeout(handler);
    } else {
      setDescriptionSuggestion(null);
    }
  }, [itemDescriptionForAISuggestions, isDescriptionSuggestionApplied, isEditMode, descriptionRegenerationTrigger]);


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

  const applyCategorySuggestion = () => {
    if (categorySuggestion) {
      form.setValue("category", categorySuggestion.category, { shouldValidate: true });
      setCategorySuggestion(null);
      setIsCategorySuggestionApplied(true);
      toast({
        title: "Catégorie Appliquée",
        description: `La catégorie "${categorySuggestion.category}" a été sélectionnée.`,
      });
    }
  };

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
    setIsSubmitting(true);
    setUploadStatusText('');
    setUploadProgress(null);

    if (!currentUser) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      router.push('/auth/signin');
      setIsSubmitting(false);
      return;
    }

    let finalImageUrls: string[] = [];
    const keptExistingUrls = imagePreviews.filter(url => url.startsWith("http"));
    finalImageUrls.push(...keptExistingUrls);

    const newFilesForUpload = values.imageFiles || [];

    try {
      if (newFilesForUpload.length > 0) {
        setUploadStatusText('Téléversement des images...');
        const uploadedNewUrls = await Promise.all(
          newFilesForUpload.map(file => uploadImageAndGetURL(file, currentUser.uid))
        );
        finalImageUrls.push(...uploadedNewUrls);
      }
      
      if (finalImageUrls.length === 0 && !isEditMode) { 
        finalImageUrls.push("https://placehold.co/600x400.png");
      }

      let finalVideoUrl: string | undefined = initialItemData?.videoUrl;
      if (values.videoFile) {
        setUploadStatusText('Téléversement de la vidéo...');
        finalVideoUrl = await uploadVideoAndGetURL(values.videoFile, currentUser.uid, (progress) => {
          setUploadProgress(progress);
        });
        setUploadProgress(100); 
      } else if (removeExistingVideo) {
        finalVideoUrl = undefined;
      }
      
      setUploadStatusText("Sauvegarde de l'annonce...");
      setUploadProgress(null);
      
      const dataAiHintForImage = `${values.category} ${values.name.split(' ').slice(0,1).join('')}`.toLowerCase().replace(/[^a-z0-9\s]/gi, '').substring(0,20);

      const commonItemData: Partial<Item> = { 
        name: values.name,
        description: values.description,
        price: Math.round(values.price),
        category: values.category,
        condition: values.condition,
        location: values.location || '',
        imageUrls: finalImageUrls, 
        videoUrl: finalVideoUrl,
        dataAiHint: dataAiHintForImage,
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
          sellerId: currentUser.uid,
          sellerName: currentUser.displayName || currentUser.email || 'Vendeur Anonyme',
          imageUrls: finalImageUrls.length > 0 ? finalImageUrls : ["https://placehold.co/600x400.png"], 
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

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentUser && !isLoadingAuth) {
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
    <div className="grid md:grid-cols-3 gap-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="md:col-span-2 space-y-8 p-6 border rounded-lg shadow-sm bg-card">
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
                {isSuggestingDescription && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Recherche d'une meilleure description...
                  </div>
                )}
                {descriptionSuggestion && !isDescriptionSuggestionApplied && (
                  <div className="mt-2 text-xs text-muted-foreground p-2 bg-accent/10 border border-accent/20 rounded-md">
                    <div className="flex items-center justify-between font-semibold text-accent mb-2">
                      Suggestion IA
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="text-sm whitespace-pre-wrap mb-3 p-2 bg-background rounded-md">{descriptionSuggestion}</p>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-3 py-1"
                        disabled={isSuggestingDescription}
                        onClick={() => {
                          setDescriptionSuggestion(null);
                          setDescriptionRegenerationTrigger(c => c + 1);
                        }}
                      >
                         <RefreshCw className="mr-2 h-3 w-3" />
                         Suggérer une autre
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-auto px-3 py-1"
                        onClick={() => {
                          form.setValue("description", descriptionSuggestion, { shouldValidate: true });
                          setDescriptionSuggestion(null);
                          setIsDescriptionSuggestionApplied(true);
                          toast({
                            title: "Description Appliquée",
                            description: "La description suggérée par l'IA a été appliquée.",
                          });
                        }}
                      >
                        Accepter la Suggestion
                      </Button>
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* --- DESKTOP LAYOUT --- */}
          <div className="hidden sm:block space-y-8">
            <div className="grid grid-cols-2 gap-8">
              {/* Price Field (Desktop) */}
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
              {/* Category Field (Desktop) */}
              <FormField
                control={form.control} name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={(value) => {field.onChange(value); setIsCategorySuggestionApplied(true);}} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ItemCategories.map((category) => ( <SelectItem key={category} value={category}> {category} </SelectItem> ))}
                      </SelectContent>
                    </Select>
                    {isSuggestingCategory && !categorySuggestion && ( <div className="mt-1 text-xs text-muted-foreground flex items-center"> <Loader2 className="h-3 w-3 animate-spin mr-1" /> Recherche de catégorie... </div> )}
                    {categorySuggestion && !isCategorySuggestionApplied && (
                      <div className="mt-1 text-xs text-muted-foreground p-2 bg-accent/10 border border-accent/20 rounded-md">
                        <div className="flex items-center justify-between">
                          <div><Sparkles className="h-3 w-3 mr-1 inline-block text-accent" /> Suggestion IA : <span className="font-semibold">{categorySuggestion.category}</span> ({Math.round(categorySuggestion.confidence * 100)}% sûr)</div>
                          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-accent hover:underline" onClick={applyCategorySuggestion}> Accepter </Button>
                        </div>
                      </div>
                    )}
                    {isCategorySuggestionApplied && form.getValues("category") && ( <div className="mt-1 text-xs text-green-600 flex items-center"> <CheckCircle className="h-3 w-3 mr-1" /> Catégorie appliquée. </div> )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-8">
                {/* Condition Field (Desktop) */}
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
                {/* Location Field (Desktop) */}
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Dakar, Sénégal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
          </div>
          
          {/* --- MOBILE LAYOUT --- */}
          <div className="sm:hidden space-y-8">
              {/* Category Field (Mobile) */}
              <FormField
                control={form.control} name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={(value) => {field.onChange(value); setIsCategorySuggestionApplied(true);}} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ItemCategories.map((category) => ( <SelectItem key={category} value={category}>{category}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    {isSuggestingCategory && !categorySuggestion && ( <div className="mt-1 text-xs text-muted-foreground flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Recherche de catégorie...</div>)}
                    {categorySuggestion && !isCategorySuggestionApplied && (
                      <div className="mt-1 text-xs text-muted-foreground p-2 bg-accent/10 border border-accent/20 rounded-md">
                        <div className="flex items-center justify-between">
                           <div><Sparkles className="h-3 w-3 mr-1 inline-block text-accent" /> Suggestion IA : <span className="font-semibold">{categorySuggestion.category}</span> ({Math.round(categorySuggestion.confidence * 100)}% sûr)</div>
                           <Button type="button" variant="link" size="sm" className="h-auto p-0 text-accent hover:underline" onClick={applyCategorySuggestion}>Accepter</Button>
                        </div>
                      </div>
                    )}
                    {isCategorySuggestionApplied && form.getValues("category") && (<div className="mt-1 text-xs text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Catégorie appliquée.</div>)}
                    <FormMessage />
                  </FormItem>
                )}
              />
            {/* Condition Field (Mobile) */}
            <FormField control={form.control} name="condition" render={({ field }) => (
              <FormItem>
                <FormLabel>État</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez l'état de l'article" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ItemConditions.map((conditionValue) => (<SelectItem key={conditionValue} value={conditionValue} className="capitalize">{conditionValue.charAt(0).toUpperCase() + conditionValue.slice(1)}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {/* Location Field (Mobile) */}
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Lieu (Optionnel)</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Dakar, Sénégal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* --- MOBILE PRICE BLOCK --- */}
          <div className="sm:hidden space-y-8">
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
              <div className="mt-8">
                  <PriceSuggestion onPriceSuggested={handlePriceSuggested} itemDescription={itemDescriptionForAISuggestions} />
              </div>
          </div>

          <FormField
            control={form.control}
            name="imageFiles"
            render={({ fieldState }) => (
              <FormItem>
                <FormLabel>Images de l'article (Max {MAX_FILES})</FormLabel>
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
                {imagePreviews.length === 0 && (
                     <div className="mt-2 h-20 w-full bg-muted rounded-md flex items-center justify-center border border-dashed">
                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                      </div>
                )}
                <FormDescription>
                  Téléchargez jusqu'à {MAX_FILES} images (Max {MAX_FILE_SIZE_MB}MB chacune). Formats: PNG, JPG, GIF, WEBP.
                  {isEditMode && " Les images existantes seront conservées si vous n'en téléchargez pas de nouvelles. Les nouvelles images s'ajouteront ou remplaceront selon votre sélection."}
                </FormDescription>
                {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
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

          <Button type="submit" size="lg" className="w-full font-bold" disabled={isSubmitting || isLoadingAuth || !currentUser}>
            {isEditMode ? <Save className="mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4" /> }
            {isEditMode ? "Sauvegarder les modifications" : "Créer l'annonce"}
          </Button>
        </form>
      </Form>
      <div className="md:col-span-1 hidden md:block">
        <PriceSuggestion
          itemDescription={itemDescriptionForAISuggestions}
          onPriceSuggested={handlePriceSuggested}
        />
      </div>
    </div>
  );
}
