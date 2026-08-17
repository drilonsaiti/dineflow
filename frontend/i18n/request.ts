import { getRequestConfig } from 'next-intl/server';
import {AVAILABLE_LANGUAGES} from "@/lib/languages";

export default getRequestConfig(async ({ requestLocale }) => {
    const requestedLocale = await requestLocale;

    const locale =
        requestedLocale &&
        AVAILABLE_LANGUAGES.some(
            (language) => language.code === requestedLocale
        )
            ? requestedLocale
            : 'en';

    return {
        locale,
        messages: (await import(`./locales/${locale}.json`)).default,
    };
});