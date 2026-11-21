export type ChipId = 'helio-g81' | 'sd-8-elite';

export type WorkloadId = 'idle' | 'gaming' | 'ai' | 'multitasking';

export type CameraPresetId = 'overview' | 'die' | 'transistor' | 'exploded' | 'thermal';

export type SubsystemId =
  | 'cpu'
  | 'gpu'
  | 'npu'
  | 'cache'
  | 'transistor'
  | 'ihs'
  | 'substrate';

export interface SubsystemSpec {
  id: SubsystemId;
  specsByChip: Record<
    ChipId,
    {
      titleAr: string;
      subtitleAr: string;
      summaryAr: string;
      insightAr: string;
      metricValue: string;
    }
  >;
  metricLabelAr: string;
}

export interface WorkloadProfile {
  id: WorkloadId;
  labelAr: string;
  descriptionAr: string;
  packetSpeed: number;
  pulseIntensity: number;
  specs: Record<
    ChipId,
    {
      fps: number;
      frameTimeMs: number;
      clockGhz: number;
      powerWatts: number;
      tempCelsius: number;
      smoothnessPct: number;
    }
  >;
}

export interface CameraPreset {
  id: CameraPresetId;
  labelAr: string;
  position: [number, number, number];
  target: [number, number, number];
  suggestedExplode?: number;
}

export const CHIP_META: Record<
  ChipId,
  {
    nameAr: string;
    shortLabelAr: string;
    nodeLabel: string;
  }
> = {
  'helio-g81': {
    nameAr: 'ميدياتك هيليو G81 · 12 نانومتر',
    shortLabelAr: 'Helio G81 (12nm)',
    nodeLabel: 'Helio G81 · 12nm',
  },
  'sd-8-elite': {
    nameAr: 'سناب دراجون 8 إيليت · 3 نانومتر',
    shortLabelAr: '8 Elite (3nm)',
    nodeLabel: '8 Elite · 3nm',
  },
};

export const SUBSYSTEM_SPECS: Record<SubsystemId, SubsystemSpec> = {
  cpu: {
    id: 'cpu',
    metricLabelAr: 'تكوين وتردد الأنوية',
    specsByChip: {
      'helio-g81': {
        titleAr: 'معالج Cortex-A75 / A55 ثماني النواة',
        subtitleAr: 'نواتان للأداء (2.0 GHz) + 6 للكفاءة (1.8 GHz)',
        summaryAr:
          'يعتمد معالج Helio G81 على نواتين Arm Cortex-A75 بتردد يصل إلى 2.0 GHz للمهام اليومية، مع ست أنوية Cortex-A55 بتردد 1.8 GHz لتوفير البطارية.',
        insightAr:
          'يوفر توزيعاً متوازناً بين السلاسة في واجهات 120Hz واستهلاك الطاقة المنخفض في الهواتف الاقتصادية والمتوسطة.',
        metricValue: '2.0 GHz (2+6)',
      },
      'sd-8-elite': {
        titleAr: 'أنوية Qualcomm Oryon (2 رئيسية + 6 أداء)',
        subtitleAr: 'معمارية All-Big-Core بتردد 4.32 GHz',
        summaryAr:
          'تعتمد على نواتين رئيسيتين بتردد 4.32 GHz وست أنوية أداء بتردد 3.53 GHz مع ذاكرة L2 بسعة 24MB.',
        insightAr:
          'قفزة +45% في الأداء و+44% في كفاءة الطاقة بفضل دقة تصنيع 3 نانومتر لضمان سلاسة فائقة دون تباطؤ.',
        metricValue: '4.32 GHz (2+6)',
      },
    },
  },
  gpu: {
    id: 'gpu',
    metricLabelAr: 'المعالج الرسومي والسلاسة',
    specsByChip: {
      'helio-g81': {
        titleAr: 'معالج الرسوميات Arm Mali-G52 MC2',
        subtitleAr: 'نواتا تظليل بتردد 820 MHz + HyperEngine',
        summaryAr:
          'وحدة رسوميات ثنائية النواة مخصصة للألعاب الشائعة ودعم شاشات FHD+ بمعدل تحديث 120Hz في القوائم والتمرير.',
        insightAr:
          'يعمل محرك MediaTek HyperEngine على تنظيم موارد المعالج والرسوميات ديناميكياً لتقليل هبوط الإطارات في الألعاب الخفيفة والمتوسطة.',
        metricValue: '820 MHz · 60 FPS',
      },
      'sd-8-elite': {
        titleAr: 'معالج الرسوميات Adreno 830 المقسّم',
        subtitleAr: '3 شرائح مستقلة + ذاكرة GMEM 12MB',
        summaryAr:
          'أول معالج رسوميات بمعمارية الشرائح المستقلة مع ذاكرة مدمجة ودعم تتبع الأشعة وUnreal Engine 5.',
        insightAr:
          'أداء أعلى بنسبة +40% وتوفير طاقة 40% لتشغيل أثقل الألعاب على 120 إطار/ثانية بثبات مستمر.',
        metricValue: '1.1 GHz · 120 FPS',
      },
    },
  },
  npu: {
    id: 'npu',
    metricLabelAr: 'معالجة الصور والذكاء',
    specsByChip: {
      'helio-g81': {
        titleAr: 'وحدة معالجة الكاميرا ISP (48MP) وHyperEngine',
        subtitleAr: 'تصوير ثنائي بدقة 16MP+16MP وفيديو 1080p',
        summaryAr:
          'يدعم Helio G81 مستشعرات كاميرا حتى 48 ميجابكسل مع تحسينات توازن الإضاءة والتركيز التلقائي السريع.',
        insightAr:
          'يعتمد على تسريع CPU/GPU ومسرّع المهام الأساسي دون وحدة NPU ضخمة، مع تركيز كامل على كفاءة التصوير اليومي.',
        metricValue: '48MP ISP · 1080p30',
      },
      'sd-8-elite': {
        titleAr: 'المحرك العصبي Qualcomm Hexagon NPU',
        subtitleAr: 'ذكاء اصطناعي توليدي متعدد الوسائط',
        summaryAr:
          'يضم مسرّعات Scalar وVector وTensor متطورة لتنفيذ النماذج اللغوية ومعالجة الكاميرا لحظياً على الجهاز.',
        insightAr:
          'أسرع بنسبة +45% لكل واط لتشغيل نماذج الذكاء الاصطناعي المحلية بسلاسة فورية.',
        metricValue: '+45% أسرع / واط',
      },
    },
  },
  cache: {
    id: 'cache',
    metricLabelAr: 'نوع وسرعة الذاكرة',
    specsByChip: {
      'helio-g81': {
        titleAr: 'ذاكرة LPDDR4X-1800 وناقل eMMC 5.1',
        subtitleAr: 'قناة مزدوجة 32-bit حتى 8GB RAM',
        summaryAr:
          'تتيح وحدة التحكم بالذاكرة في Helio G81 العمل مع ذواكر LPDDR4X بتردد 1800MHz وتخزين eMMC 5.1 المدمج.',
        insightAr:
          'تقدم توازناً اقتصادياً لتشغيل التطبيقات الاجتماعية والتنقل السلس مع خفض تكلفة المنصة واستهلاك الطاقة.',
        metricValue: 'LPDDR4X · 14.4 GB/s',
      },
      'sd-8-elite': {
        titleAr: 'ذاكرة L2 (24MB) وناقل LPDDR5X-5300',
        subtitleAr: 'ممر بيانات فائق الاتساع 84.8 GB/s',
        summaryAr:
          'ذاكرة مخبئية ضخمة من المستوى الثاني موزعة بين أنوية Oryon مع دعم تردد رام 5300MHz وتخزين UFS 4.0.',
        insightAr:
          'تختصر زمن جلب البيانات بشكل حاد لضمان عدم وجود أي تأخير عند تعدد المهام الثقيلة.',
        metricValue: 'LPDDR5X · 84.8 GB/s',
      },
    },
  },
  transistor: {
    id: 'transistor',
    metricLabelAr: 'دقة التصنيع الهندسية',
    specsByChip: {
      'helio-g81': {
        titleAr: 'عقدة تصنيع 12 نانومتر (TSMC 12FFC FinFET)',
        subtitleAr: 'تقنية FinFET ناضجة ومستقرة للتكلفة والكفاءة',
        summaryAr:
          'تستخدم رقاقة Helio G81 دقة تصنيع 12 نانومتر ببنية FinFET التي توازن بين كفاءة الإنتاج والاستقرار الحراري في الفئة الاقتصادية.',
        insightAr:
          'مقارنةً بعقد 28nm القديمة تحقق وفراً كبيراً في البطارية، بينما تتفوق عقد 3nm الحديثة بكثافة ترانزستورات أعلى بأضعاف.',
        metricValue: '12nm FinFET',
      },
      'sd-8-elite': {
        titleAr: 'عقدة تصنيع 3 نانومتر (TSMC N3E)',
        subtitleAr: 'كثافة ترانزستورات فائقة وتقليل التسرب',
        summaryAr:
          'تصغير البوابات المنطقية إلى 3 نانومتر يسمح بدمج مليارات الترانزستورات مع خفض الجهد التشغيلي بشكل جذري.',
        insightAr:
          'تمكّن الوصول لتردد 4.32 GHz في أنوية Oryon مع الحفاظ على استهلاك طاقة منخفض وحرارة مستقرة.',
        metricValue: '3nm N3E',
      },
    },
  },
  ihs: {
    id: 'ihs',
    metricLabelAr: 'السلوك الحراري',
    specsByChip: {
      'helio-g81': {
        titleAr: 'الغلاف الحراري ومشتت التغليف (Helio G81)',
        subtitleAr: 'تبديد حراري هادئ بحدود 2.5–3.8 واط',
        summaryAr:
          'يعمل المعالج بترددات معتدلة (2.0 GHz) ما يجعل انبعاثه الحراري سهل الاحتواء حتى بدون غرف تبخير معقدة في الهواتف الاقتصادية.',
        insightAr:
          'تحت الضغط المستمر في الألعاب قد ترتفع حرارة دقة 12nm تدريجياً، لذا يدير HyperEngine الترددات للحفاظ على الاستقرار.',
        metricValue: '42°C تحت الضغط',
      },
      'sd-8-elite': {
        titleAr: 'غرفة البخار ومشتت التيتانيوم (8 Elite)',
        subtitleAr: 'تبديد حراري عالي الكفاءة لأحمال 4.32 GHz',
        summaryAr:
          'طبقة تغليف متطورة مع مسارات تبخير نحاسية لنقل الحرارة بعيداً عن عناقيد Oryon وAdreno 830.',
        insightAr:
          'بفضل دقة 3nm وانخفاض الطاقة المهدرة بنسبة 44%، يحافظ على الأداء الذروي دون اختناق حراري.',
        metricValue: '39°C بكفاءة 3nm',
      },
    },
  },
  substrate: {
    id: 'substrate',
    metricLabelAr: 'الاتصال والتغذية',
    specsByChip: {
      'helio-g81': {
        titleAr: 'الركيزة الحاملة ومودم 4G LTE Cat-7 المدمج',
        subtitleAr: 'دعم شريحتي 4G VoLTE + Wi-Fi 5 + BT 5.0',
        summaryAr:
          'تضم لوحة التغليف مسارات تغذية الأنوية ومودم 4G LTE المدمج في الشريحة نفسها لتقليل مساحة اللوحة الأم للهاتف.',
        insightAr:
          'يوفر تكامل المودم داخل شريحة Helio G81 تصميماً مدمجاً يقلل استهلاك الطاقة أثناء الاتصال المستمر بالشبكة.',
        metricValue: '4G LTE Cat-7 · BT 5.0',
      },
      'sd-8-elite': {
        titleAr: 'الركيزة عالية التردد ومودم X80 5G',
        subtitleAr: 'تغذية طاقة متعددة الأطوار لتردد 4.32 GHz',
        summaryAr:
          'منصة تغليف متعددة الطبقات مع مكثفات تنعيم الجهد لتغذية أنوية Oryon ومودم 5G المتطور.',
        insightAr:
          'تدعم انتقالات التردد السريعة واستقرار الفولتية عند ذروة الحوسبة والرسوميات.',
        metricValue: '5G X80 · Wi-Fi 7',
      },
    },
  },
};

export const WORKLOAD_PROFILES: Record<WorkloadId, WorkloadProfile> = {
  idle: {
    id: 'idle',
    labelAr: 'سكون متزن',
    descriptionAr: 'تصفح خفيف ومزامنة بالاعتماد على أنوية الكفاءة',
    packetSpeed: 0.45,
    pulseIntensity: 0.35,
    specs: {
      'helio-g81': {
        fps: 120,
        frameTimeMs: 8.4,
        clockGhz: 1.05,
        powerWatts: 0.55,
        tempCelsius: 32,
        smoothnessPct: 97.5,
      },
      'sd-8-elite': {
        fps: 120,
        frameTimeMs: 8.3,
        clockGhz: 1.45,
        powerWatts: 0.38,
        tempCelsius: 30,
        smoothnessPct: 100,
      },
    },
  },
  gaming: {
    id: 'gaming',
    labelAr: 'ألعاب وتحديث عالٍ',
    descriptionAr: 'تشغيل الألعاب بإعدادات متوسطة على Mali-G52 مقابل 120fps على Adreno 830',
    packetSpeed: 1.45,
    pulseIntensity: 0.95,
    specs: {
      'helio-g81': {
        fps: 60,
        frameTimeMs: 16.7,
        clockGhz: 2.0,
        powerWatts: 3.6,
        tempCelsius: 44,
        smoothnessPct: 86.5,
      },
      'sd-8-elite': {
        fps: 120,
        frameTimeMs: 8.3,
        clockGhz: 4.32,
        powerWatts: 4.6,
        tempCelsius: 40,
        smoothnessPct: 99.6,
      },
    },
  },
  ai: {
    id: 'ai',
    labelAr: 'كاميرا ومعالجة',
    descriptionAr: 'معالجة صور 48MP في Helio G81 مقابل الذكاء التوليدي في Hexagon',
    packetSpeed: 1.15,
    pulseIntensity: 0.85,
    specs: {
      'helio-g81': {
        fps: 60,
        frameTimeMs: 16.6,
        clockGhz: 1.9,
        powerWatts: 2.7,
        tempCelsius: 39,
        smoothnessPct: 91.0,
      },
      'sd-8-elite': {
        fps: 120,
        frameTimeMs: 8.3,
        clockGhz: 3.85,
        powerWatts: 3.1,
        tempCelsius: 37,
        smoothnessPct: 99.8,
      },
    },
  },
  multitasking: {
    id: 'multitasking',
    labelAr: 'تعدد المهام',
    descriptionAr: 'تنقل يومي بين التطبيقات الاجتماعية ومتصفح الويب',
    packetSpeed: 1.0,
    pulseIntensity: 0.72,
    specs: {
      'helio-g81': {
        fps: 90,
        frameTimeMs: 11.1,
        clockGhz: 1.95,
        powerWatts: 2.9,
        tempCelsius: 40,
        smoothnessPct: 92.4,
      },
      'sd-8-elite': {
        fps: 120,
        frameTimeMs: 8.3,
        clockGhz: 4.1,
        powerWatts: 3.8,
        tempCelsius: 38,
        smoothnessPct: 99.3,
      },
    },
  },
};

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'overview',
    labelAr: 'شامل',
    position: [4.6, 3.6, 4.9],
    target: [0, 0.75, 0],
    suggestedExplode: 0.35,
  },
  {
    id: 'die',
    labelAr: 'الأنوية والرسوميات',
    position: [2.15, 2.55, 2.25],
    target: [0, 0.95, 0],
    suggestedExplode: 0.65,
  },
  {
    id: 'transistor',
    labelAr: 'دقة التصنيع',
    position: [1.55, 1.95, 1.65],
    target: [0, 1.48, 0],
    suggestedExplode: 0.85,
  },
  {
    id: 'exploded',
    labelAr: 'تفكيك الطبقات',
    position: [5.4, 3.2, 5.2],
    target: [0, 1.2, 0],
    suggestedExplode: 1.0,
  },
  {
    id: 'thermal',
    labelAr: 'التبريد',
    position: [-3.8, 3.1, 3.9],
    target: [0, 1.3, 0],
    suggestedExplode: 0.5,
  },
];
