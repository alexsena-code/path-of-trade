import { getProductsWithParams, getLeagues } from "@/app/actions";
import { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Filters from "./filters";
import { parseProductSlug } from "@/utils/url-helper";
import ProductDetail from "../../../../../components/product-detail";
import { getProductBySlug } from "@/sanity/sanity-utils";
import ProductContent from "@/components/product-detail/ProductContent";

// Add formatPrice utility function
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export const generateMetadata = async (props: {
  params: Promise<{ name: string; locale: string }>;
}): Promise<Metadata> => {
  const params = await props.params;
  // Get a readable product name from the URL slug
  const productName = await parseProductSlug(params.name);
  const { locale } = params;
  const baseUrl = "https://www.pathoftrade.net";
  const canonicalPath = locale === "en" ? `/products/${params.name}` : `/${locale}/products/${params.name}`;

  return {
    title: `Buy POE ${productName} | Fast & Safe Currency | PathofTrade.net`,
    description: `Buy cheap ${productName} for Path of Exile. Get your PoE currency instantly & securely from PathofTrade.net.`,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: `/products/${params.name}`,
        "pt-BR": `/pt-br/products/${params.name}`,
      },
    },
    openGraph: {
      title: `Buy POE ${productName} | Fast & Safe Currency | PathofTrade.net`,
      description: `Buy cheap ${productName} for Path of Exile. Get your PoE currency instantly & securely from PathofTrade.net.`,
      type: "website",
      locale: locale,
    },
  };
};

export default async function ProductDetailPage(props: {
  params: Promise<{ name: string, locale: string }>;
  searchParams: Promise<{
    league?: string;
    difficulty?: string;
    gameVersion?: "path-of-exile-1" | "path-of-exile-2";
    locale?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  try {
    // Get the decoded product name for searching
    const decodedName = await parseProductSlug(params.name);

    // Use the decoded name to find the specific product
    const products = await getProductsWithParams({
      search: decodedName,
      league: searchParams.league,
      difficulty: searchParams.difficulty,
      gameVersion: searchParams.gameVersion,
    });

    const productSanity = await getProductBySlug(products[0].slug);
    console.log(productSanity);

    // If no product is found, show an error
    if (!products || products.length === 0) {
      return (
        <div className="container mx-auto py-16 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
            <p className="mb-8 text-muted-foreground">
              The product '{decodedName}' could not be found. It may have been
              removed or doesn't exist.
            </p>
            <Link href="/products">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Browse All Products
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    // Use the first product from the results
    const product = products[0];


    // Fetch leagues from database based on product's game version
    const currentGameVersion = searchParams.gameVersion || product.gameVersion;
    const leaguesData = await getLeagues(
      currentGameVersion as "path-of-exile-1" | "path-of-exile-2"
    );
    const leagueOptions = leaguesData.map((league) => league.name);

    // Difficulty options
    const difficultyOptions = ["softcore", "hardcore"];

    // Game version options
    const gameVersionOptions = [
      { value: "path-of-exile-1", label: "Path of Exile 1" },
      { value: "path-of-exile-2", label: "Path of Exile 2" },
    ];

    // --- SMART LEAGUE SELECTION START ---
    // If no league param, try to find the "Challenge League" (not Standard/Hardcore)
    let smartDefaultLeague = product.league;

    if (!searchParams.league) {
      // Find first active league that is NOT Standard/Hardcore
      // Assuming "Standard" or "Hardcore" string presence identifies non-challenge leagues
      const challengeLeague = leaguesData.find(l =>
        !l.name.toLowerCase().includes('standard') &&
        !l.name.toLowerCase().includes('hardcore')
      );
      if (challengeLeague) {
        smartDefaultLeague = challengeLeague.name;
      } else {
        // Fallback to first available if strictly standard/hardcore
        if (leaguesData.length > 0) smartDefaultLeague = leaguesData[0].name;
      }
    }

    const currentLeague = searchParams.league || smartDefaultLeague;
    // --- SMART LEAGUE SELECTION END ---

    const currentDifficulty = searchParams.difficulty || product.difficulty;
    let currentLocale = searchParams.locale || params.locale;

    // Try to find the product variant for the selected/smart league
    // This ensures price/image matches the actually selected league, not just the random first result
    const smartProduct = products.find(p => p.league === currentLeague && p.difficulty === currentDifficulty) || product;

    if (currentLocale === "pt-br") {
      currentLocale = "pt_br";
    }

    console.log(currentLocale);

    // Currency conversion logic for Schema (Approximation)
    const isBr = currentLocale === "pt_br" || currentLocale === "pt-br";
    const currency = isBr ? "BRL" : "USD";
    const exchangeRate = 5.60; // Fallback rate matching context
    const price = isBr ? Number((smartProduct.price * exchangeRate).toFixed(2)) : smartProduct.price;

    const productStructuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: smartProduct.name,
      description: productSanity?.body?.[0]?.children?.[0]?.text || smartProduct.name,
      image: smartProduct.imgUrl,
      brand: {
        "@type": "Brand",
        name: smartProduct.gameVersion,
      },
      offers: {
        "@type": "Offer",
        url: `https://pathoftrade.net/${params.locale}/products/${encodeURIComponent(smartProduct.name)}`,
        priceCurrency: currency,
        price: price,
        availability: "https://schema.org/InStock",
        priceValidUntil: new Date(new Date().setDate(new Date().getDate() + 30))
          .toISOString()
          .split("T")[0],
        seller: {
          "@type": "Organization",
          name: "Path of Trade Net",
          url: "https://pathoftrade.net",
        },
      },
    };

    return (
      <div className="container mx-auto py-6 md:py-12 px-4">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productStructuredData),
          }}
        />

        <div className="max-w-6xl mx-auto rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {/* Product Image */}
            <div className="p-4 md:p-6 flex items-center justify-center bg-black/10 rounded-lg">
              <div className="relative w-full aspect-square max-w-[200px] md:max-w-[250px]">
                <Image
                  src={smartProduct.imgUrl || "/images/placeholder.jpg"}
                  alt={smartProduct.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                  quality={100}
                  priority
                />
              </div>
            </div>

            {/* Product Info */}
            <ProductDetail
              product={smartProduct}
              currentGameVersion={currentGameVersion}
              currentLeague={currentLeague}
              currentDifficulty={currentDifficulty}
              gameVersionOptions={gameVersionOptions}
              leagueOptions={leagueOptions}
              difficultyOptions={difficultyOptions}
              productName={decodedName}
            />
          </div>
        </div>

        {/* Description Section */}
        {productSanity?.body && (
          <div className="p-4 md:p-6 mt-6 md:mt-12 bg-muted/10 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-100/40 mb-4">Description</h2>
            <ProductContent content={productSanity.body[currentLocale]} />
          </div>
        )}
      </div>
    );
  } catch (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading product: {(error as Error).message}
      </div>
    );
  }
}
