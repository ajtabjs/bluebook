/**
 * Service Worker for Bluebook PWA
 * Pure Cache API - no Workbox dependency
 */

const CACHE_NAME = 'bluebook-v12';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './bluebook-16x16.1121fe81.png',
  './bluebook-32x32.cb8ed68a.png',
  './bluebook-192x192.5d752eee.png',
  './bluebook-512x512.0148e2a2.png',
  './cd173ebc1e719033.svg',
  './f83137da2104c653.svg',
  './1e8ffee1ac6ff755.svg',
  './3ebda4955e48bdfa.svg',
  './45f9e80d892a8583.svg',
  './7616ebc5551f295d.svg',
  './7c5454f13e7d157c.svg',
  './802e74d124150325.svg',
  './89da239509290a5b.svg',
  './a059f9a86ee9f66a.svg',
  './c3ee5d4d5a1f2c34.svg',
  './cba6998ee1bf9b2a.svg',
  './d65cbe15e1e0a517.svg',
  './f8e6109dd28f690d.svg',
  // Newly fetched assets (2026-10-21)
  './004b4ded0631369d.svg',
  './7f78bf74a8d25e47.jpg',
  './d4c93f0b28f86eb0.svg',
  './c1411e5c1d7fe13b.svg',
  './7bd760a299d920bf.svg',
  './0f2e210813afd2c7.svg',
  './735f43f66779a35f.svg',
  './cd9bdefcb0254309.svg',
  './5f09b2f31c83ace5.svg',
  './6974139c0f180a95.svg',
  './7270cbfed3ff9d91.svg',
  './1063fd5a65908453.svg',
  './e89c482bb3c378ae.woff2',
  // Additional fonts from vendor-public.js
  './11e05b7d957a8fa8.woff2',
  './1fef99d151543045.woff2',
  './2a63183e6dff7d00.woff2',
  './3443d6ceebc5f7ae.woff',
  './35bf7b51c120b339.ttf',
  './390061c79a976b33.woff2',
  './45af087b9f656297.woff',
  './4e7449338f3a9fee.woff2',
  './78caebf195bb74dd.woff2',
  './86fc2559ff73eac5.woff2',
  './97b722c1a6a9477b.ttf',
  './a8535ca1f2f140ec.woff',
  './b4556791e2a9e005.woff2',
  './b905938f03330d83.woff2',
  './e6298ae4e67c21f0.woff2',
  './f8693cca22ae31bc.woff2',
  './f8d92427fd4ddeb5.ttf',
  './mspaint-clone.js',
  // Newly fetched SVG assets (2026-10-21 continued)
  './715fcd2e39ff411d.svg',
  './11055a0648d683a6.svg',
  './a792eab23094eeec.svg',
  './7cfa9270fd0b7684.svg',
  './bc17356e5dc6d30c.svg',
  './007828162fd2b8f3.svg',
  './0082e50aaab28bb0.svg',
  './00e2d1d661ffa070.svg',
  './00f994102fcbc2e1.svg',
  './01363e2db9349f80.svg',
  './023c75d2ebb5b302.svg',
  './02e61ab22de86263.svg',
  './031e2e4f4e4f2a96.svg',
  './033243728044e231.svg',
  './036d5296143a89fb.svg',
  './0391d308a746eb32.svg',
  './03b235b7812b6ac3.svg',
  './056020b4effca207.svg',
  './0641c664a09ed07e.svg',
  './06a02f1c283e89d1.svg',
  './08212a73759247cf.svg',
  './0a1af38073046c51.svg',
  './0a7c376dd69fd7df.svg',
  './0b2757885ab5b2b4.svg',
  './0c7d62e0b36aff4a.svg',
  './0d1a1b182758c9d6.svg',
  './0dbfc14bdef05026.svg',
  './0ddae387cb77beff.svg',
  './0efdee7fca3e27a0.svg',
  './0f20fc40e8c00707.svg',
  './0f511b748cc47313.svg',
  './0f89f0ef6fb538ba.svg',
  './105f304582285be3.svg',
  './10b0154bdc148b65.svg',
  './10cd7461ebf76d0d.svg',
  './10d73c26c6a77d69.svg',
  './118bf3f83ba3154d.svg',
  './149ace5d2d8e986e.svg',
  './16d0fb6a8b27964c.svg',
  './17d15003965a1173.svg',
  './1a91b7f168f27eb4.svg',
  './1abd2cd08fd58bf4.svg',
  './1af98240a84c8e5a.svg',
  './1b95b30631ce897c.svg',
  './1cb2c472d3e25e5b.svg',
  './1cc4f627dbe0710f.svg',
  './1cf91f55b6fd7b59.svg',
  './1d038623f92e1d1d.svg',
  './1ea39d00e55a266c.svg',
  './1ecc1935d1d68d97.svg',
  './20853508b81c06b7.svg',
  './211bc58f8fba8e2e.svg',
  './22a16fe73c9e3873.svg',
  './2334cd53fe74f857.svg',
  './26618f2301d2fa72.svg',
  './2747246b35c2d43c.svg',
  './276e922bf71c95a9.svg',
  './27918dad6a278518.svg',
  './279594f27e330f9d.svg',
  './28064de24ac7541f.svg',
  './281942b375764e30.svg',
  './28a8b7c4cce4fb09.svg',
  './2915993aca52218f.svg',
  './296a05b71028cebb.svg',
  './2a25298e567988b9.svg',
  './2b4efb9515cf8c34.svg',
  './2bc07f1045a10349.svg',
  './2c43d9ae1e770fad.svg',
  './2c63464310ccada0.svg',
  './2d63ef9791ea9e4a.svg',
  './2f24df7b93f61def.svg',
  './2fbaa1eb21d92364.svg',
  './314974fc13cc8bdb.svg',
  './3178bd7845274a2c.svg',
  './33078656a36e3e84.svg',
  './3397084a62e2ea9d.svg',
  './33f5a84582bb5247.svg',
  './3424af99ec6fa3f1.svg',
  './35033920599698e6.svg',
  './35567c25a20fd4d3.svg',
  './355e0609a765e1fa.svg',
  './3605e793c05b2450.svg',
  './36fa25e530319c6c.svg',
  './370855e786106ef0.svg',
  './375b056c68629490.svg',
  './37d944172e7f96a3.svg',
  './383fe6ae57652aac.svg',
  './38738f027a336665.svg',
  './38c46be8e10bb761.svg',
  './38e5b70e67b02922.svg',
  './38e97e1265847a28.svg',
  './39200e329dc861e3.svg',
  './3996bd1f52ee4e31.svg',
  './3b69374e56f56d17.svg',
  './3b799e92f1247585.svg',
  './3c4a73a4273ddb19.svg',
  './3c9773f01d2ab7a1.svg',
  './3ca3cbf224e0eab3.svg',
  './3d6d9eb07eadcad5.svg',
  './3d9f6ab3be5ac35d.svg',
  './3dcdeac52e63cb86.svg',
  './3ddb2bfd1cd905d2.svg',
  './3e7b1189e6343d3e.svg',
  './3e86b9db3efa4ddf.svg',
  './3e92fbe6a2720805.svg',
  './3ee233ce4fb10b83.svg',
  './3ef0521ab9895bbe.svg',
  './3fcfe2658e60c779.svg',
  './41d78b522e26a35b.svg',
  './4368b0336490f05d.svg',
  './43b2960715061dde.svg',
  './45038e68d9fe2868.svg',
  './46a47958077ac6a5.svg',
  './46ce743fb411b11d.svg',
  './486cfc75e3b6138a.svg',
  './4980f3e73b42886c.svg',
  './4a91cb500d4e925f.svg',
  './4c1c83b35f0f10ea.svg',
  './4c55c54d98f4e3b3.svg',
  './4de215f606f3d36c.svg',
  './4dfa9e7414474977.svg',
  './4e08ebfe1088cbf8.svg',
  './4eceab112ac782a4.svg',
  './50d81ab4c46c1714.svg',
  './510333ad76438be6.svg',
  './51391404e90543f9.svg',
  './51540e6f840b0b73.svg',
  './515db838f816053e.svg',
  './51860b28c4d10b9d.svg',
  './51e205f7631a4f5d.svg',
  './52616d6f42a8885b.svg',
  './53daea3b25bb98c4.svg',
  './5554f9dcbd3243b9.svg',
  './55a5f2e6931ce274.svg',
  './55ca8d44e4d8c660.svg',
  './560d484636e81525.svg',
  './564f0ed3fc344784.svg',
  './566d4a42eeb223d7.svg',
  './56b9b9aeb429c1eb.svg',
  './5711442fe1d03848.svg',
  './58362de11a4675ba.svg',
  './58363138721282ea.svg',
  './58dfcd554905d2a8.svg',
  './59261b3c5899eb11.svg',
  './5a2da3f282fc9924.svg',
  './5aa9ccbe0edff77d.svg',
  './5b2ed204d817b3c2.svg',
  './5b737729ed6bd3c0.svg',
  './5ba213d2e37e70ab.svg',
  './5bd26e75edbc5ca1.svg',
  './5c69e7118fef2932.svg',
  './5c9ef26080b34a99.svg',
  './5cb5c7b670010c3f.svg',
  './5deb2a1beac347ee.svg',
  './5e00dfc0db4a163f.svg',
  './60df763629e8377a.svg',
  './60e075a3f556476e.svg',
  './614db739eb39641d.svg',
  './631f9c8f815d9b38.svg',
  './63268f1cf6604603.svg',
  './63c6cd824aa2fa5c.svg',
  './65454061b8d2b348.svg',
  './65511295d8029775.svg',
  './67821d16d88f66f9.svg',
  './67853741ea9a1983.svg',
  './68813fce0ada0243.svg',
  './68f4f68eae0b59b1.svg',
  './69709e9ec3259624.svg',
  './69adc4cc90c537b7.svg',
  './69b3f148243c6127.svg',
  './6b5231682f3da41d.svg',
  './6b56af523bb88457.svg',
  './6c167634447bac02.svg',
  './6c17504a0166a157.svg',
  './6c409b694bb0cf41.svg',
  './6c602ee380379a06.svg',
  './6cb58c6ce838bd6f.svg',
  './6cc85c6d8712fcb9.svg',
  './6d34242ac795cfaa.svg',
  './6d85d5fee71c5b40.svg',
  './6e3eca3db0efc50c.svg',
  './6e92ddef4d897e55.svg',
  './71f64e016d88daa3.svg',
  './739412b702ddc489.svg',
  './73bdf0b82e666d12.svg',
  './73efd7a86b7e49ad.svg',
  './74da57fea4f66d50.svg',
  './753b138f578cd2b3.svg',
  './76dd1d984cdc68d8.svg',
  './778c401fa658f933.svg',
  './782091071b9f508e.svg',
  './7935bc5cd615f50d.svg',
  './7a6cc54b6f43ee75.svg',
  './7bfd52e0e70b4ab6.svg',
  './7c802d752d28d1f8.svg',
  './7d4b141ebce0b63b.svg',
  './7df7dc1182a5198a.svg',
  './80d2a58f95483879.svg',
  './80f0b0cba19a2511.svg',
  './810100905311be49.svg',
  './811de741b7254c67.svg',
  './8130092630c45807.svg',
  './813b77620a0c63f7.svg',
  './815e65112e497a6d.svg',
  './81b2b7219413c8ca.svg',
  './81ed6d34f2f30462.svg',
  './82b0ca7157ebb023.svg',
  './82e3d80e97aa0822.svg',
  './84f75e1398c40dd9.svg',
  './85d508d2916cda85.svg',
  './85dd746c8dd53fdd.svg',
  './86d681906803b776.svg',
  './87941002f7dfdd3a.svg',
  './87a16b7b70bbb226.svg',
  './87bb2e43e429eb28.svg',
  './87c8d9eb4b84a21f.svg',
  './888de6bc5ac3691c.svg',
  './888f647736196e4c.svg',
  './89707164338dd3e3.svg',
  './89bbd28f198ac1eb.svg',
  './8afdf17907c3add8.svg',
  './8c145dc65179a87c.svg',
  './8ce792c10c219dbf.svg',
  './8d6ee84d9980ecf8.svg',
  './8dc04ea68acfb5a1.svg',
  './8e0dc365eb23e680.svg',
  './8e5fb14a56a7d6d2.svg',
  './8fc60b9b55650d0e.svg',
  './8fe43b74ff80c6cb.svg',
  './8fe50c606fe2a2ee.svg',
  './904992c9cc1f9bba.svg',
  './9063d1be6ac59b83.svg',
  './90ea13dd4a7b59a5.svg',
  './9287a98ab63e0928.svg',
  './92bea5117ca43991.svg',
  './94a6b12285f622eb.svg',
  './95faaff4c9c0eb49.svg',
  './97307b6ca4f06216.svg',
  './98b487140203aa31.svg',
  './990dad7de239179e.svg',
  './9a7b8dde06122fad.svg',
  './9b5acbe8e1b21e85.svg',
  './9c09e472e62f9b60.svg',
  './9c17ea61b63e40b6.svg',
  './9e4a44b0b23213fa.svg',
  './9e6d4656fa96e51e.svg',
  './a0eef0075e5ad630.svg',
  './a1ef9746d2fff4e4.svg',
  './a201a7a5bb5330c4.svg',
  './a36cc5d29c58edd2.svg',
  './a38d1db2e8162982.svg',
  './a39ac18c2d1312ac.svg',
  './a3f3d1aad0440ced.svg',
  './a44a6cc6ae229425.svg',
  './a5acf53f879ddf11.svg',
  './a5b285b8716a6682.svg',
  './a5c33a74409abaac.svg',
  './a5ef70c1fedde634.svg',
  './a603f2b2a0811bae.svg',
  './a68fdc946dbd3474.svg',
  './a73fc662750b3143.svg',
  './a78d90d98f6d92fe.svg',
  './a7c5f120ce83199e.svg',
  './a7f82f1c41f24414.svg',
  './a86262f411d5527b.svg',
  './a8a8aad13822d1c8.svg',
  './a9bc186895075303.svg',
  './a9fb92af15ef8bca.svg',
  './aa2253e920a30d2e.svg',
  './aa3731f4a29e2885.svg',
  './aba8daf7049f7ca6.svg',
  './ac288fe68e5cbe22.svg',
  './ac9aa60c2885ddfc.svg',
  './acbdb1b5577651b1.svg',
  './ad5cb16ee38a95de.svg',
  './adb40153e3237533.svg',
  './ae054fca5cc3d64b.svg',
  './ae123ab30735c0a8.svg',
  './b0b99f6a6db9df7e.svg',
  './b10bcc714603ff4b.svg',
  './b305df12692d39be.svg',
  './b47bde95b8bf01b9.svg',
  './b4ee9747fb5d97d9.svg',
  './b51462f5ee3467cb.svg',
  './b59017ea995d1859.svg',
  './b6a2615e2338f6a6.svg',
  './b6d29b864af5a60a.svg',
  './b72af7f567cac24c.svg',
  './b72f4618252c1e39.svg',
  './b790e75642bc733b.svg',
  './b878f32b26a8ed70.svg',
  './b8c21ef7dbce94e0.svg',
  './b9aef0db3054fe25.svg',
  './ba1be6aa3624e1e2.svg',
  './ba70e181d07a57eb.svg',
  './bb2990d233214385.svg',
  './bb498e2a4d0c0196.svg',
  './bc4014b662adc139.svg',
  './bcec5dbecf32ed37.svg',
  './bd897c2e6da6194d.svg',
  './bf34438999c0aaa0.svg',
  './bf497473425382c1.svg',
  './bf53ab3241e4cfec.svg',
  './bf5e50f8f185ffb9.svg',
  './c0f86029cd253ee9.svg',
  './c2485944775291da.svg',
  './c30357280b0a2b97.svg',
  './c3b454e42c27692e.svg',
  './c46b05ec1a5b2afb.svg',
  './c4b35d8608e233d3.svg',
  './c5b551cb37c31b14.svg',
  './c67c31b6f10fb660.svg',
  './c69b9db1ba875472.svg',
  './c69c0a6061fe51a2.svg',
  './c9d04bb714093623.svg',
  './ca1b260f9479e88f.svg',
  './ca440d5788a659ab.svg',
  './cb4deb09dc407b5c.svg',
  './cbe2b1e2e5ef8bda.svg',
  './cc6ad3207dc27a8f.svg',
  './ccb3e8aa835c5a2b.svg',
  './ccc0356eac4c7f57.svg',
  './cd71b3799a294f96.svg',
  './cffc9ba7075f180f.svg',
  './d17425c28b734f56.svg',
  './d2710a99bab6b9f3.svg',
  './d2b961702fce51d1.svg',
  './d4d446acf8113d71.svg',
  './d4f522d3412cb4eb.svg',
  './d5a1515c47a8ad8d.svg',
  './d654d9f77b336f0e.svg',
  './d6d13d2de8d11f7d.svg',
  './d6f5d48bff003c5d.svg',
  './d739e55757a83171.svg',
  './d780ce1a2a8186b2.svg',
  './d7adb0729751ea12.svg',
  './d80122d012c8bd55.svg',
  './d81977d8b7e6e393.svg',
  './d936af7178dd8fec.svg',
  './d941033c0fe22f41.svg',
  './d95540fd6f3f1539.svg',
  './da1c6908e4af48ad.svg',
  './da47b795866d8809.svg',
  './dba8dce228b31f9a.svg',
  './dc290c5fcc8d7a03.svg',
  './dc8482e76c05ce3d.svg',
  './dd7ce74849da9081.svg',
  './ddc66eb07cc97a47.svg',
  './de095bd7a582dc65.svg',
  './de21bdf9501dcf2a.svg',
  './de543f916a757073.svg',
  './de576d1a3a2f57af.svg',
  './de6db7e48ae786d7.svg',
  './de948860dc52336a.svg',
  './defa66dae0277109.svg',
  './df851f760c0c00d8.svg',
  './df8e6070630df711.svg',
  './e0e52be6ac1585ce.svg',
  './e0edeed4919ca814.svg',
  './e144b90e85582020.svg',
  './e26796482e130306.svg',
  './e41ababc4298916d.svg',
  './e4b655186dc46228.svg',
  './e4c52305da845f65.svg',
  './e50023a0a1d77a70.svg',
  './e51e91b32178cc86.svg',
  './e59413d23012dad2.svg',
  './e656d2c874f4e222.svg',
  './e65911ee7cb23cc4.svg',
  './e67b2bd76f1d1f4c.svg',
  './e69bc6acf9b0212b.svg',
  './e6e5967f6e20ace8.svg',
  './e7c529309afd3145.svg',
  './e95f16902271cd4f.svg',
  './e9bf0759260ea4ba.svg',
  './e9c105b204bbf971.svg',
  './ea3c141ad42f59a7.svg',
  './ea66658041baefeb.svg',
  './eafe245737d1461c.svg',
  './eaffbf197d43860d.svg',
  './eb53dc7a65f0df69.svg',
  './ee50298e8398102b.svg',
  './f012182c2dab4ebe.svg',
  './f0535aaa33558896.svg',
  './f2047ed0ba7f016a.svg',
  './f4641fa16d82c6f0.svg',
  './f4a159e84f433a6f.svg',
  './f54997492d73c337.svg',
  './f585bf9ceafdcd57.svg',
  './f5864769cad9c2d9.svg',
  './f5c265154fd5b6ad.svg',
  './f61d7dcaadd4135a.svg',
  './f656cd80cf3b0ee7.svg',
  './f6d94e13114ffa4b.svg',
  './f8f1302dfaca6158.svg',
  './f953f564b9fc6332.svg',
  './fb04bed0c2ecc73b.svg',
  './fd64c4f794ad87be.svg',
  './fea6249e7437a932.svg',
  './ff050eaeb06690d0.svg',
  // Font file
  './fonts/NotoSerif-Regular.woff2',
  // Response/telemetry workers
  './responses-worker.4f27696af686b45e.js',
  './telemetry-worker.4f27696af686b45e.js',
  './integrity-worker.4f27696af686b45e.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // GH Pages fix: intercept absolute paths for local assets and rewrite to relative
  // e.g., /cd173ebc1e719033.svg -> ./cd173ebc1e719033.svg
  // BUT don't rewrite paths that are already correctly scoped to the repo path
  const absolutePath = url.pathname;
  // Detect repo path from SW scope (e.g., /bluebook/ for https://user.github.io/bluebook/)
  const repoPath = self.registration?.scope ? new URL(self.registration.scope).pathname : '/';
  
  if (absolutePath.startsWith('/') && !absolutePath.startsWith('/api/') && !absolutePath.startsWith(repoPath)) {
    const assetExtensions = ['.svg', '.woff2', '.woff', '.ttf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.css', '.js'];
    const isLocalAsset = assetExtensions.some(ext => absolutePath.endsWith(ext));
    if (isLocalAsset) {
      const relativePath = '.' + absolutePath;
      console.log(`[SW] Rewriting absolute asset path: ${absolutePath} -> ${relativePath}`);
      event.respondWith(
        caches.match(relativePath).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback: try fetching the relative path
          return fetch(new Request(relativePath, request)).then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(relativePath, responseClone);
              });
            }
            return networkResponse;
          });
        })
      );
      return;
    }
  }

  // Cache-first strategy for static assets
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first for HTML and API requests
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// Background sync for exam data
self.addEventListener('sync', (event) => {
  if (event.tag === 'exam-sync') {
    event.waitUntil(syncExamData());
  }
});

async function syncExamData() {
  // Placeholder for exam data synchronization
  console.log('[SW] Background sync triggered');
}

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});