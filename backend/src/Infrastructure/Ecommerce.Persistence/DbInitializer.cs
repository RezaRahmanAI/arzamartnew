using Ecommerce.Application.Common.Helpers;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        if (await context.Products.CountAsync() > 0) return; // Skip if products exist

        // 1. Seed Admin & Customer Users
        var adminUser = new User
        {
            Email = "admin@arza.com",
            PasswordHash = PasswordHasher.HashPassword("Admin@123456"),
            FirstName = "Admin",
            LastName = "User",
            PhoneNumber = "01700000000",
            Role = UserRole.Admin
        };

        var sampleUsersData = new[]
        {
            ("nusrat@example.com", "Nusrat", "Jahan", "01700000000"),
            ("tanvir@example.com", "Tanvir", "Ahmed", "01812345678"),
            ("farhan@example.com", "Farhan", "Rahman", "01711111111"),
            ("sadia@example.com", "Sadia", "Islam", "01822222222"),
            ("rifat@example.com", "Rifat", "Hossain", "01933333333"),
            ("mehjabin@example.com", "Mehjabin", "Chowdhury", "01744444444"),
            ("arif@example.com", "Arif", "Mahmud", "01855555555"),
            ("zarin@example.com", "Zarin", "Tasnim", "01966666666"),
            ("imran@example.com", "Imran", "Kabir", "01777777777"),
            ("sumaiya@example.com", "Sumaiya", "Akter", "01888888888"),
            ("rakib@example.com", "Rakib", "Hasan", "01999999999"),
            ("nafisa@example.com", "Nafisa", "Karim", "01712345678")
        };

        var userEntities = new List<User> { adminUser };
        var customerEntities = new List<Customer>();

        foreach (var (email, firstName, lastName, phone) in sampleUsersData)
        {
            var user = new User
            {
                Email = email,
                PasswordHash = PasswordHasher.HashPassword("Customer@123456"),
                FirstName = firstName,
                LastName = lastName,
                PhoneNumber = phone,
                Role = UserRole.Customer
            };
            userEntities.Add(user);
        }

        if (!await context.Users.AnyAsync())
        {
            context.Users.AddRange(userEntities);
            await context.SaveChangesAsync();

            foreach (var user in userEntities.Where(u => u.Role == UserRole.Customer))
            {
                customerEntities.Add(new Customer
                {
                    UserId = user.Id,
                    FullName = $"{user.FirstName} {user.LastName}",
                    Email = user.Email,
                    Phone = user.PhoneNumber,
                    DefaultAddress = "House 14, Road 7, Dhanmondi, Dhaka 1205",
                    District = "Dhaka",
                    IsGuest = false
                });
            }

            context.Customers.AddRange(customerEntities);
            await context.SaveChangesAsync();
        }

        // 2. Seed Banners
        var heroSummerBanner = new Banner
        {
            Title = "Summer, sorted",
            Subtitle = "Breathable linen shirts made for Dhaka heat.",
            ImageUrl = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200",
            TargetUrl = "/category/shirts",
            DisplayOrder = 1,
            IsActive = true,
            Position = "slider"
        };

        var heroTeesBanner = new Banner
        {
            Title = "Oversized graphic tees",
            Subtitle = "Heavy 240 GSM cotton, printed in-house.",
            ImageUrl = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200",
            TargetUrl = "/category/t-shirts",
            DisplayOrder = 2,
            IsActive = true,
            Position = "slider"
        };

        var offerBanner = new Banner
        {
            Title = "Eid Bundle",
            Subtitle = "Buy 2, save 20%",
            ImageUrl = "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200",
            TargetUrl = "/offers",
            DisplayOrder = 3,
            IsActive = true,
            Position = "offer"
        };

        context.Banners.AddRange(heroSummerBanner, heroTeesBanner, offerBanner);

        // 3. Seed Brands
        var arzaBrand = new Brand { Name = "Arza Fashion", Slug = "arza-fashion", LogoUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" };
        var cloudlightBrand = new Brand { Name = "Cloudlight", Slug = "cloudlight", LogoUrl = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400" };
        var noorBrand = new Brand { Name = "Noor Collection", Slug = "noor-collection", LogoUrl = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400" };

        context.Brands.AddRange(arzaBrand, cloudlightBrand, noorBrand);

        // 4. Seed Categories
        var tshirtsCat = new Category { Name = "T-Shirts", Slug = "t-shirts", DisplayOrder = 1, ImageUrl = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800" };
        var shirtsCat = new Category { Name = "Shirts", Slug = "shirts", DisplayOrder = 2, ImageUrl = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800" };
        var panjabiCat = new Category { Name = "Panjabi", Slug = "panjabi", DisplayOrder = 3, ImageUrl = "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800" };
        var hoodiesCat = new Category { Name = "Hoodies", Slug = "hoodies", DisplayOrder = 4, ImageUrl = "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800" };
        var trousersCat = new Category { Name = "Trousers", Slug = "trousers", DisplayOrder = 5, ImageUrl = "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800" };

        context.Categories.AddRange(tshirtsCat, shirtsCat, panjabiCat, hoodiesCat, trousersCat);
        await context.SaveChangesAsync();

        // 5. Seed Products from Frontend View
        var productsList = new List<Product>
        {
            new Product
            {
                BrandId = arzaBrand.Id,
                CategoryId = tshirtsCat.Id,
                Name = "Midnight Heavyweight Tee",
                Slug = "midnight-heavy-tee",
                SKU = "TS-MHT-01",
                ShortDescription = "A 240 GSM combed cotton tee with a boxy fall, ribbed neck and pre-shrunk finish.",
                FullDescription = "Made for maximum comfort during Dhaka summers. Features reinforced collar stitching and heavyweight 240 GSM combed cotton.",
                BasePrice = 990,
                DiscountPrice = 790,
                IsFeatured = true,
                AverageRating = 4.9m,
                ReviewCount = 56,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Size: M", SKU = "TS-MHT-01-M", PriceOverride = 790, StockQuantity = 30 },
                    new ProductVariant { Name = "Size: L", SKU = "TS-MHT-01-L", PriceOverride = 820, StockQuantity = 25 },
                    new ProductVariant { Name = "Size: XL", SKU = "TS-MHT-01-XL", PriceOverride = 850, StockQuantity = 15 },
                    new ProductVariant { Name = "Size: XXL", SKU = "TS-MHT-01-XXL", PriceOverride = 890, StockQuantity = 10 }
                }
            },
            new Product
            {
                BrandId = arzaBrand.Id,
                CategoryId = tshirtsCat.Id,
                Name = "Arza Rooftop Graphic Tee",
                Slug = "arza-graphic-tee",
                SKU = "TS-ARG-02",
                ShortDescription = "Oversized silhouette with a hand-drawn print, screen printed with water-based ink.",
                FullDescription = "Relaxed streetwear fit designed for city lifestyle. Hand-drawn urban graphics on soft 220 GSM cotton.",
                BasePrice = 1090,
                DiscountPrice = 890,
                IsFeatured = true,
                AverageRating = 4.8m,
                ReviewCount = 38,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Size: M", SKU = "TS-ARG-02-M", PriceOverride = 890, StockQuantity = 20 },
                    new ProductVariant { Name = "Size: L", SKU = "TS-ARG-02-L", PriceOverride = 920, StockQuantity = 20 }
                }
            },
            new Product
            {
                BrandId = cloudlightBrand.Id,
                CategoryId = shirtsCat.Id,
                Name = "Cloudlight Linen Shirt",
                Slug = "cloudlight-linen-shirt",
                SKU = "SH-CLS-03",
                ShortDescription = "Airy 100% linen weave with a soft collar and coconut buttons.",
                FullDescription = "Designed specifically for hot and humid weather. Features genuine organic linen fabric with coconut shell buttons.",
                BasePrice = 1890,
                DiscountPrice = 1490,
                IsFeatured = true,
                AverageRating = 4.95m,
                ReviewCount = 84,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Size: M", SKU = "SH-CLS-03-M", PriceOverride = 1490, StockQuantity = 25 },
                    new ProductVariant { Name = "Size: L", SKU = "SH-CLS-03-L", PriceOverride = 1550, StockQuantity = 20 },
                    new ProductVariant { Name = "Size: XL", SKU = "SH-CLS-03-XL", PriceOverride = 1590, StockQuantity = 12 }
                }
            },
            new Product
            {
                BrandId = cloudlightBrand.Id,
                CategoryId = shirtsCat.Id,
                Name = "Everyday Oxford Shirt",
                Slug = "oxford-everyday-shirt",
                SKU = "SH-EOS-04",
                ShortDescription = "Classic oxford cotton with a slightly relaxed fit. Works tucked in or open.",
                FullDescription = "Versatile smart-casual shirt built with premium cotton oxford weave. Great for both work and weekends.",
                BasePrice = 1350,
                DiscountPrice = 1350,
                AverageRating = 4.7m,
                ReviewCount = 29,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Size: M", SKU = "SH-EOS-04-M", PriceOverride = 1350, StockQuantity = 18 },
                    new ProductVariant { Name = "Size: L", SKU = "SH-EOS-04-L", PriceOverride = 1390, StockQuantity = 15 }
                }
            },
            new Product
            {
                BrandId = noorBrand.Id,
                CategoryId = panjabiCat.Id,
                Name = "Noor Cotton Panjabi",
                Slug = "noor-cotton-panjabi",
                SKU = "PJ-NCP-05",
                ShortDescription = "Fine cotton panjabi with tonal chikan-style embroidery along the placket and cuffs.",
                FullDescription = "Elegant traditional wear handcrafted with subtle placket embroidery and premium breathable cotton.",
                BasePrice = 2390,
                DiscountPrice = 2390,
                IsFeatured = true,
                AverageRating = 5.0m,
                ReviewCount = 92,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Size: L", SKU = "PJ-NCP-05-L", PriceOverride = 2490, StockQuantity = 30 },
                    new ProductVariant { Name = "Size: XL", SKU = "PJ-NCP-05-XL", PriceOverride = 2590, StockQuantity = 20 }
                }
            },
            new Product
            {
                BrandId = noorBrand.Id,
                CategoryId = panjabiCat.Id,
                Name = "Shomoy Slim Panjabi",
                Slug = "shomoy-panjabi",
                SKU = "PJ-SSP-08",
                ShortDescription = "Slim-cut panjabi in breathable viscose-cotton with a mandarin collar and side vents.",
                FullDescription = "Modern tailored panjabi with slim silhouette, ideal for festive gatherings and evening wear.",
                BasePrice = 1990,
                DiscountPrice = 1990,
                AverageRating = 4.8m,
                ReviewCount = 35,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Size: M", SKU = "PJ-SSP-08-M", PriceOverride = 1990, StockQuantity = 20 },
                    new ProductVariant { Name = "Size: L", SKU = "PJ-SSP-08-L", PriceOverride = 2090, StockQuantity = 15 }
                }
            },
            new Product
            {
                BrandId = arzaBrand.Id,
                CategoryId = hoodiesCat.Id,
                Name = "Winterfold Fleece Hoodie",
                Slug = "winterfold-hoodie",
                SKU = "HD-WFH-06",
                ShortDescription = "Brushed fleece inside, dense knit outside, with a double-layer hood.",
                FullDescription = "Heavyweight winter hoodie crafted with 350 GSM double-brushed fleece for chilly Dhaka evenings.",
                BasePrice = 1790,
                DiscountPrice = 1790,
                AverageRating = 4.85m,
                ReviewCount = 47,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Size: L", SKU = "HD-WFH-06-L", PriceOverride = 1850, StockQuantity = 15 },
                    new ProductVariant { Name = "Size: XL", SKU = "HD-WFH-06-XL", PriceOverride = 1890, StockQuantity = 10 }
                }
            },
            new Product
            {
                BrandId = arzaBrand.Id,
                CategoryId = trousersCat.Id,
                Name = "Campus Stretch Chino",
                Slug = "campus-chino",
                SKU = "TR-CSC-07",
                ShortDescription = "Mid-rise chino in stretch twill with a tapered leg and deep pockets.",
                FullDescription = "Flexible elastane-blend stretch twill chinos engineered for maximum mobility and durability.",
                BasePrice = 1690,
                DiscountPrice = 1690,
                AverageRating = 4.75m,
                ReviewCount = 61,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Size: 32", SKU = "TR-CSC-07-32", PriceOverride = 1690, StockQuantity = 25 },
                    new ProductVariant { Name = "Size: 34", SKU = "TR-CSC-07-34", PriceOverride = 1750, StockQuantity = 20 }
                }
            },
            new Product
            {
                BrandId = arzaBrand.Id,
                CategoryId = tshirtsCat.Id,
                Name = "T-Shirt & Trouser Combo",
                Slug = "tshirt-trouser-combo",
                SKU = "BD-TTC-09",
                ShortDescription = "Pair our bestselling heavyweight tee with active stretch trousers.",
                FullDescription = "Complete everyday active set combining 240 GSM combed tee with comfortable stretch trousers.",
                BasePrice = 1680,
                DiscountPrice = 1290,
                IsFeatured = true,
                AverageRating = 4.9m,
                ReviewCount = 42,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Standard", SKU = "BD-TTC-09-STD", PriceOverride = 1290, StockQuantity = 30 }
                }
            },
            new Product
            {
                BrandId = cloudlightBrand.Id,
                CategoryId = shirtsCat.Id,
                Name = "Summer Linen Set",
                Slug = "summer-linen-set",
                SKU = "BD-SLS-10",
                ShortDescription = "Two premium light linen shirts to beat the summer heat.",
                FullDescription = "Double package of ultra-breathable 100% linen shirts with natural coconut buttons.",
                BasePrice = 2380,
                DiscountPrice = 1800,
                AverageRating = 4.85m,
                ReviewCount = 28,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Standard", SKU = "BD-SLS-10-STD", PriceOverride = 1800, StockQuantity = 20 }
                }
            },
            new Product
            {
                BrandId = arzaBrand.Id,
                CategoryId = tshirtsCat.Id,
                Name = "Premium Tee Trio",
                Slug = "premium-tee-trio",
                SKU = "BD-PTT-11",
                ShortDescription = "Get 3 of our premium combed cotton tees in a single package.",
                FullDescription = "Value bundle containing three heavyweight combed cotton t-shirts in classic urban colors.",
                BasePrice = 1770,
                DiscountPrice = 1350,
                AverageRating = 4.92m,
                ReviewCount = 74,
                Images = new List<ProductImage>
                {
                    new ProductImage { ImageUrl = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800", IsMain = true, DisplayOrder = 1 }
                },
                Variants = new List<ProductVariant>
                {
                    new ProductVariant { Name = "Standard", SKU = "BD-PTT-11-STD", PriceOverride = 1350, StockQuantity = 40 }
                }
            }
        };

        context.Products.AddRange(productsList);

        // 6. Seed Coupons
        var welcomeCoupon = new Coupon
        {
            Code = "WELCOME10",
            DiscountPercentage = 10,
            MinimumSpend = 500,
            ExpirationDate = DateTime.UtcNow.AddYears(1),
            UsageLimit = 1000
        };

        var eidCoupon = new Coupon
        {
            Code = "EID2026",
            DiscountAmount = 200,
            MinimumSpend = 1500,
            ExpirationDate = DateTime.UtcNow.AddMonths(3),
            UsageLimit = 500
        };

        context.Coupons.AddRange(welcomeCoupon, eidCoupon);

        // 7. Seed Website Settings
        var fullSettingsJson = @"
        {
          ""general"": {
            ""websiteName"": ""ARZAMART"",
            ""websiteShortName"": ""ARZAMART"",
            ""tagline"": ""Elegance in Every Thread"",
            ""description"": ""Premium Bangladeshi fashion & lifestyle brand providing high quality apparel."",
            ""websiteStatus"": ""live"",
            ""maintenanceMessage"": ""We are undergoing scheduled maintenance. Please check back shortly!"",
            ""defaultLanguage"": ""English (US)"",
            ""defaultCurrency"": ""BDT"",
            ""currencySymbol"": ""৳"",
            ""timeZone"": ""Asia/Dhaka"",
            ""dateFormat"": ""YYYY-MM-DD"",
            ""timeFormat"": ""12-hour""
          },
          ""branding"": {
            ""headerLogo"": ""/logo.png"",
            ""footerLogo"": ""/logo.png"",
            ""darkLogo"": ""/logo-dark.png"",
            ""lightLogo"": ""/logo-light.png"",
            ""favicon"": ""/favicon.ico"",
            ""mobileLogo"": ""/logo-mobile.png"",
            ""primaryColor"": ""#a62d24"",
            ""secondaryColor"": ""#f5ede4"",
            ""accentColor"": ""#e06b3a"",
            ""buttonColor"": ""#a62d24"",
            ""borderRadius"": ""0.75rem"",
            ""fontFamily"": ""Inter, sans-serif""
          },
          ""contact"": {
            ""companyName"": ""ARZAMART Ltd."",
            ""ownerName"": ""Arza Admin"",
            ""supportPhone"": ""+880 1700-000000"",
            ""salesPhone"": ""+880 1800-000000"",
            ""whatsAppNumber"": ""+880 1700-000000"",
            ""emailAddress"": ""info@alzeena.com"",
            ""supportEmail"": ""support@alzeena.com"",
            ""officeAddress"": ""House 42, Road 11, Block D, Banani, Dhaka-1213, Bangladesh"",
            ""googleMapEmbedUrl"": ""https://maps.google.com/maps?q=Banani,Dhaka&t=&z=13&ie=UTF8&iwloc=&output=embed""
          },
          ""shipping"": {
            ""rules"": [
              { ""id"": ""ship_1"", ""name"": ""Inside Dhaka"", ""charge"": 70, ""estimatedDeliveryTime"": ""24-48 Hours"", ""status"": ""active"", ""displayOrder"": 1 },
              { ""id"": ""ship_2"", ""name"": ""Sub Dhaka (Dhaka Suburbs)"", ""charge"": 100, ""estimatedDeliveryTime"": ""2-3 Days"", ""status"": ""active"", ""displayOrder"": 2 },
              { ""id"": ""ship_3"", ""name"": ""Outside Dhaka"", ""charge"": 130, ""estimatedDeliveryTime"": ""3-5 Days"", ""status"": ""active"", ""displayOrder"": 3 },
              { ""id"": ""ship_4"", ""name"": ""Express Delivery (Dhaka Only)"", ""charge"": 200, ""estimatedDeliveryTime"": ""Same Day (Within 12h)"", ""status"": ""active"", ""displayOrder"": 4 }
            ],
            ""defaultShippingMethodId"": ""ship_1"",
            ""freeShippingThreshold"": 5000,
            ""enableFreeShipping"": true,
            ""cashOnDeliveryAvailable"": true
          },
          ""socialMedia"": {
            ""platforms"": [
              { ""id"": ""soc_1"", ""platform"": ""Facebook"", ""url"": ""https://facebook.com/alzeena.official"", ""iconName"": ""Facebook"", ""displayOrder"": 1, ""active"": true },
              { ""id"": ""soc_2"", ""platform"": ""Instagram"", ""url"": ""https://instagram.com/alzeena.official"", ""iconName"": ""Instagram"", ""displayOrder"": 2, ""active"": true },
              { ""id"": ""soc_3"", ""platform"": ""TikTok"", ""url"": ""https://tiktok.com/@alzeena.bd"", ""iconName"": ""Music2"", ""displayOrder"": 3, ""active"": true },
              { ""id"": ""soc_4"", ""platform"": ""WhatsApp"", ""url"": ""https://wa.me/8801700000000"", ""iconName"": ""MessageCircle"", ""displayOrder"": 4, ""active"": true },
              { ""id"": ""soc_5"", ""platform"": ""YouTube"", ""url"": ""https://youtube.com/@alzeenabd"", ""iconName"": ""Youtube"", ""displayOrder"": 5, ""active"": true }
            ],
            ""sources"": {
              ""Facebook Page"": [""Alzeena Official FB Page"", ""Alzeena Fashion FB Page""],
              ""Instagram DM"": [""Alzeena Main IG (@alzeena.official)""],
              ""WhatsApp"": [""WhatsApp Hotline 1 (01700-000000)""]
            }
          },
          ""business"": {
            ""businessName"": ""Alzeena Fashion Limited"",
            ""tradeLicenseNumber"": ""TRAD/DNCC/019283/2024"",
            ""binNumber"": ""004928172-0101"",
            ""vatNumber"": ""VAT-BD-928371"",
            ""companyRegistrationNumber"": ""C-192837/2024"",
            ""businessEmail"": ""billing@alzeena.com"",
            ""businessPhone"": ""+880 2-9876543""
          },
          ""seo"": {
            ""defaultMetaTitle"": ""Alzeena | Premium Fashion & Apparel Bangladesh"",
            ""defaultMetaDescription"": ""Shop the latest premium traditional & contemporary fashion collection online at Alzeena Bangladesh."",
            ""metaKeywords"": ""fashion, dresses, alzeena, clothing, online shopping bangladesh"",
            ""openGraphImage"": ""/og-image.jpg"",
            ""twitterCardImage"": ""/twitter-card.jpg"",
            ""robotsTxtOptions"": ""User-agent: *\\nAllow: /\\nDisallow: /admin/"",
            ""googleVerificationCode"": ""google-site-verification=abc123xyz456"",
            ""facebookVerificationCode"": ""fb-domain-verification=fb1234567890"",
            ""googleAnalyticsId"": ""G-ALZEENA123"",
            ""googleTagManagerId"": ""GTM-ALZ999"",
            ""facebookPixelId"": ""987654321098"",
            ""microsoftClarityId"": ""clr_alz888""
          },
          ""footer"": {
            ""copyrightText"": ""© 2026 Alzeena. All rights reserved. Built with passion in Bangladesh."",
            ""footerDescription"": ""Alzeena is your premier destination for authentic Bangladeshi fashion and apparel."",
            ""footerMenuLinks"": [
              { ""label"": ""About Us"", ""url"": ""/about"" },
              { ""label"": ""Privacy Policy"", ""url"": ""/privacy"" },
              { ""label"": ""Terms of Service"", ""url"": ""/terms"" }
            ],
            ""paymentMethodsBadges"": [""bKash"", ""Nagad"", ""Rocket"", ""Visa"", ""Mastercard"", ""Cash on Delivery""],
            ""certifications"": [""ISO 9001 Certified"", ""100% Authentic Product Guarantee""],
            ""trustBadges"": [""Secure SSL Payment"", ""Fast Nationwide Delivery"", ""Easy 7-Day Returns""],
            ""showFooterLogo"": true,
            ""enableNewsletterToggle"": true
          },
          ""orders"": {
            ""minimumOrderAmount"": 200,
            ""maximumOrderAmount"": 100000,
            ""allowGuestCheckout"": true,
            ""requirePhoneVerification"": false,
            ""enableCoupon"": true,
            ""enableReferral"": true,
            ""enableCOD"": true,
            ""enableOnlinePayment"": true,
            ""defaultOrderStatus"": ""Pending"",
            ""orderIdPrefix"": ""ORD-"",
            ""nextOrderNumber"": 10001
          },
          ""notifications"": {
            ""smsApiKey"": ""sms_live_api_key_alz_8892"",
            ""smsSenderId"": ""ALZEENA"",
            ""enableSMS"": true,
            ""smtpHost"": ""smtp.mailtrap.io"",
            ""smtpPort"": 587,
            ""smtpUsername"": ""alzeena_smtp_user"",
            ""smtpPassword"": ""••••••••••••"",
            ""smtpSenderName"": ""Alzeena Orders"",
            ""whatsAppApiConfig"": ""wa_cloud_api_v18_token"",
            ""whatsAppBusinessNumber"": ""+8801700000000""
          },
          ""advanced"": {
            ""debugMode"": false,
            ""apiLogging"": true,
            ""maintenanceScheduler"": ""Disabled"",
            ""cacheStatus"": ""Active (Memory & Redis Cached)"",
            ""lastCacheRebuild"": ""2026-08-06T12:00:00.000Z""
          }
        }";

        var settings = new WebsiteSettings
        {
            SiteName = "ARZAMART",
            SupportEmail = "support@alzeena.com",
            SupportPhone = "+880 1700-000000",
            DeliveryInsideDhaka = "70",
            DeliveryOutsideDhaka = "130",
            SettingsJson = fullSettingsJson
        };

        context.WebsiteSettings.Add(settings);

        await context.SaveChangesAsync();
    }
}
