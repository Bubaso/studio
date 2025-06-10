
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
import { Loader2, UploadCloud, XCircle, Save, Sparkles, CheckCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { uploadImageAndGetURL, createItemInFirestore, updateItemInFirestore } from "@/services/itemService";
import { suggestItemCategory } from "@/ai/flows/suggest-item-category-flow";
import Image from "next/image";
import Link from "next/link";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILES = 5;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

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
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

interface ListingFormProps {
  initialItemData?: Item | null;
}

export function ListingForm({ initialItemData = null }: ListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState<{ category: ItemCategory; confidence: number } | null>(null);
  const [isCategorySuggestionApplied, setIsCategorySuggestionApplied] = useState(false);


  const isEditMode = !!initialItemData?.id;

  const [imagePreviews, setImagePreviews] = useState<string[]>(initialItemData?.imageUrls || []);
  const [objectUrlToFileMap, setObjectUrlToFileMap] = useState<Map<string, File>>(new Map());


  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      name: initialItemData?.name || "",
      description: initialItemData?.description || "",
      price: initialItemData?.price || 0,
      category: initialItemData?.category as ItemCategory | undefined,
      condition: initialItemData?.condition as ItemCondition | undefined,
      location: initialItemData?.location || "",
      imageFiles: [],
    },
  });

  useEffect(() => {
    if (initialItemData) {
        form.reset({
            name: initialItemData.name,
            description: initialItemData.description,
            price: initialItemData.price,
            category: initialItemData.category as ItemCategory,
            condition: initialItemData.condition as ItemCondition,
            location: initialItemData.location || "",
            imageFiles: [],
        });
        setImagePreviews(initialItemData.imageUrls || []);
    }
  }, [initialItemData, form]);


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

  const itemDescriptionForAISuggestion = form.watch("description");

  // Debounce category suggestion
  useEffect(() => {
    if (itemDescriptionForAISuggestion && itemDescriptionForAISuggestion.length > 20 && !isCategorySuggestionApplied && !isEditMode) {
      const handler = setTimeout(async () => {
        setIsSuggestingCategory(true);
        try {
          const suggestion = await suggestItemCategory({ itemDescription: itemDescriptionForAISuggestion });
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
      }, 1000); // 1 second delay

      return () => {
        clearTimeout(handler);
      };
    } else {
      setCategorySuggestion(null); // Clear suggestion if description is too short or already applied
    }
  }, [itemDescriptionForAISuggestion, isCategorySuggestionApplied, isEditMode]);


  const handlePriceSuggested = (price: number) => {
    form.setValue("price", Math.round(price));
  };

  const applyCategorySuggestion = () => {
    if (categorySuggestion) {
      form.setValue("category", categorySuggestion.category, { shouldValidate: true });
      setCategorySuggestion(null); // Hide suggestion after applying
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
  

  async function onSubmit(values: ListingFormValues) {
    setIsSubmitting(true);
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
    if (newFilesForUpload.length > 0) {
      try {
        const uploadedNewUrls = await Promise.all(
          newFilesForUpload.map(file => uploadImageAndGetURL(file, currentUser.uid))
        );
        finalImageUrls.push(...uploadedNewUrls);
      } catch (uploadError) {
        console.error("Error uploading new images:", uploadError);
        toast({ title: "Erreur de téléversement", description: "Certaines images n'ont pas pu être téléversées.", variant: "destructive"});
        setIsSubmitting(false);
        return;
      }
    }
    
    if (finalImageUrls.length === 0) {
      finalImageUrls.push("https://placehold.co/600x400.png");
    }
    
    const dataAiHintForImage = `${values.category} ${values.name.split(' ').slice(0,1).join('')}`.toLowerCase().replace(/[^a-z0-9\s]/gi, '').substring(0,20);

    const commonItemData = {
      name: values.name,
      description: values.description,
      price: Math.round(values.price),
      category: values.category,
      condition: values.condition,
      location: values.location || '',
      imageUrls: finalImageUrls,
      dataAiHint: dataAiHintForImage,
    };

    try {
      if (isEditMode && initialItemData?.id) {
        await updateItemInFirestore(initialItemData.id, commonItemData);
        toast({
          title: "Annonce mise à jour !",
          description: `Votre article "${values.name}" a été modifié avec succès.`,
        });
        router.push(`/items/${initialItemData.id}`);
      } else {
        const newItemFullData = {
          ...commonItemData,
          sellerId: currentUser.uid,
          sellerName: currentUser.displayName || currentUser.email || 'Vendeur Anonyme',
        };
        const newItemId = await createItemInFirestore(newItemFullData as Omit<Item, 'id' | 'postedDate' | 'lastUpdated'>);
        toast({
          title: "Annonce créée !",
          description: `Votre article "${values.name}" a été mis en vente avec succès.`,
        });
        router.push(`/items/${newItemId}`);
      }
    } catch (error) {
      console.error(`Échec de ${isEditMode ? "la mise à jour" : "la création"} de l'annonce:`, error);
      toast({
        title: "Erreur",
        description: `Échec de ${isEditMode ? "la mise à jour" : "la création"} de l'annonce. Veuillez réessayer.`,
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
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
          <div className="grid sm:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix (FCFA)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" placeholder="ex: 25000" {...field}
                      onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      onBlur={e => {
                        const value = parseInt(e.target.value, 10)
                        if(!isNaN(value)) field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select onValueChange={(value) => {field.onChange(value); setIsCategorySuggestionApplied(true);}} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ItemCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSuggestingCategory && !categorySuggestion && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" /> Recherche de catégorie...
                    </div>
                  )}
                  {categorySuggestion && !isCategorySuggestionApplied && (
                    <div className="mt-1 text-xs text-muted-foreground p-2 bg-accent/10 border border-accent/20 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                            <Sparkles className="h-3 w-3 mr-1 inline-block text-accent" />
                            Suggestion IA : <span className="font-semibold">{categorySuggestion.category}</span> ({Math.round(categorySuggestion.confidence * 100)}% sûr)
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-accent hover:underline"
                          onClick={applyCategorySuggestion}
                        >
                          Accepter
                        </Button>
                      </div>
                    </div>
                  )}
                  {isCategorySuggestionApplied && form.getValues("category") && (
                     <div className="mt-1 text-xs text-green-600 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" /> Catégorie appliquée.
                     </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <div className="grid sm:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>État</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez l'état de l'article" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ItemConditions.map((conditionValue) => (
                        <SelectItem key={conditionValue} value={conditionValue} className="capitalize">
                          {conditionValue.charAt(0).toUpperCase() + conditionValue.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          </div>

          <FormField
            control={form.control}
            name="imageFiles"
            render={({ fieldState }) => (
              <FormItem>
                <FormLabel>Images de l'article (Max {MAX_FILES})</FormLabel>
                <FormControl>
                  <div>
                    <Input
                      type="file"
                      accept="image/png, image/jpeg, image/gif, image/webp"
                      multiple
                      onChange={handleFileChange}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      disabled={(imagePreviews.length >= MAX_FILES)}
                    />
                    {(imagePreviews.length >= MAX_FILES) && (
                        <FormDescription className="text-destructive">
                            Vous avez atteint la limite de {MAX_FILES} images.
                        </FormDescription>
                    )}
                  </div>
                </FormControl>
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
                  {isEditMode && " Les nouvelles images remplaceront les anciennes si vous en sélectionnez."}
                </FormDescription>
                {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
              </FormItem>
            )}
          />


          <Button type="submit" size="lg" className="w-full font-bold" disabled={isSubmitting || isLoadingAuth || !currentUser}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? <Save className="mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4" />) }
            {isSubmitting ? (isEditMode ? "Sauvegarde..." : "Publication...") : (isEditMode ? "Sauvegarder les modifications" : "Créer l'annonce")}
          </Button>
        </form>
      </Form>
      <div className="md:col-span-1">
        <PriceSuggestion
          itemDescription={itemDescriptionForAISuggestion}
          onPriceSuggested={handlePriceSuggested}
        />
      </div>
    </div>
  );
}

    