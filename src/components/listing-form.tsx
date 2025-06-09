
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
import { ItemCategories, ItemConditions } from "@/lib/types";
import { PriceSuggestion } from "./price-suggestion";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, XCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { uploadImageAndGetURL } from "@/services/itemService"; 
import Image from "next/image";

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
  description: z.string().min(10, "La description doit comporter au moins 10 caractères.").max(1000),
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

export function ListingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      location: "",
      imageFiles: [],
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const itemDescriptionForAISuggestion = form.watch("description");

  const handlePriceSuggested = (price: number) => {
    form.setValue("price", Math.round(price));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const currentFiles = form.getValues("imageFiles") || [];
      const newFiles = Array.from(files);
      const combinedFiles = [...currentFiles, ...newFiles].slice(0, MAX_FILES);
      form.setValue("imageFiles", combinedFiles, { shouldValidate: true });

      const newPreviews = combinedFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    }
  };

  const removeImage = (indexToRemove: number) => {
    const currentFiles = form.getValues("imageFiles") || [];
    const updatedFiles = currentFiles.filter((_, index) => index !== indexToRemove);
    form.setValue("imageFiles", updatedFiles, { shouldValidate: true });

    const updatedPreviews = updatedFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(updatedPreviews);
  };
  
  // Clean up Object URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);


  async function onSubmit(values: ListingFormValues) {
    setIsSubmitting(true);
    if (!currentUser) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour créer une annonce.", variant: "destructive" });
      router.push('/auth/signin');
      setIsSubmitting(false);
      return;
    }

    let uploadedImageUrls: string[] = ["https://placehold.co/600x400.png"];
    let dataAiHintForImage = `${values.category} ${values.name.split(' ').slice(0,1).join('')}`.toLowerCase();

    try {
      if (values.imageFiles && values.imageFiles.length > 0) {
        uploadedImageUrls = await Promise.all(
          values.imageFiles.map(file => uploadImageAndGetURL(file, currentUser.uid))
        );
        // Hint based on the first uploaded image or kept generic
        dataAiHintForImage = `${values.category} ${values.imageFiles[0].name.split('.')[0].split('_').pop() || values.name.split(" ")[0]}`.toLowerCase().replace(/[^a-z0-9\s]/gi, '').substring(0, 20);
      }

      const newItemData = {
        name: values.name,
        description: values.description,
        price: Math.round(values.price),
        category: values.category,
        condition: values.condition,
        location: values.location || '',
        imageUrls: uploadedImageUrls, // Save array of URLs
        sellerId: currentUser.uid,
        sellerName: currentUser.displayName || currentUser.email || 'Vendeur Anonyme',
        postedDate: serverTimestamp(),
        dataAiHint: dataAiHintForImage
      };

      const docRef = await addDoc(collection(db, "items"), newItemData);

      toast({
        title: "Annonce créée !",
        description: `Votre article "${values.name}" a été mis en vente avec succès.`,
      });
      router.push(`/items/${docRef.id}`);
    } catch (error) {
      console.error("Échec de la création de l'annonce:", error);
      let errorMessage = "Échec de la création de l'annonce. Veuillez réessayer.";
      if (error instanceof Error && error.message.includes('storage/unauthorized')) {
        errorMessage = "Erreur de permission lors du téléversement de l'image. Vérifiez les règles de Firebase Storage.";
      } else if (error instanceof Error && error.message.includes('storage/object-not-found')) {
        errorMessage = "Erreur lors du téléversement de l'image : objet non trouvé.";
      }
      toast({
        title: "Erreur",
        description: errorMessage,
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
            <p className="text-muted-foreground mb-4">Vous devez être connecté pour lister un article.</p>
            <Link href="/auth/signin">
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            render={() => ( // field is not directly used here as we manage array with custom logic
              <FormItem>
                <FormLabel>Images de l'article (Max {MAX_FILES})</FormLabel>
                <FormControl>
                  <>
                    <Input
                      type="file"
                      accept="image/png, image/jpeg, image/gif, image/webp"
                      multiple
                      onChange={handleFileChange}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      disabled={(form.watch('imageFiles')?.length || 0) >= MAX_FILES}
                    />
                    {(form.watch('imageFiles')?.length || 0) >= MAX_FILES && (
                        <FormDescription className="text-destructive">
                            Vous avez atteint la limite de {MAX_FILES} images.
                        </FormDescription>
                    )}
                  </>
                </FormControl>
                 {imagePreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {imagePreviews.map((previewUrl, index) => (
                        <div key={index} className="relative group aspect-square">
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
                            className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100 transition-opacity"
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
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


          <Button type="submit" size="lg" className="w-full font-bold" disabled={isSubmitting || isLoadingAuth || !currentUser}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Publication..." : "Créer l'annonce"}
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
