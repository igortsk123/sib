import Script from "next/script"

import { METRIKA_ID } from "@/lib/metrika"

// Публичный слой лендинга (вне закрытой админки): без авторизации, с Метрикой.
// Счётчик появляется, когда владелец создаст его и задаст NEXT_PUBLIC_METRIKA_ID.
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {METRIKA_ID > 0 && (
        <>
          <Script id="metrika" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],
              k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
              ym(${METRIKA_ID}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true});`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://mc.yandex.ru/watch/${METRIKA_ID}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
          </noscript>
        </>
      )}
    </>
  )
}
