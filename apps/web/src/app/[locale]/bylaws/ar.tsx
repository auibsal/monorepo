'use client';

import { useState, useEffect } from 'react';

export default function ar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white font-sans overflow-x-hidden relative">
      
      {/* Background Grids */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay fixed z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none fixed z-0"></div>

      {/* HEADER SECTION */}
      <header className="relative z-10 pt-32 pb-16 px-6 md:px-12 lg:px-24 border-b border-white/10 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-[1px] bg-red-600"></div>
          <div className="text-red-500 font-mono text-xs uppercase tracking-widest">وثيقة تنظيمية رسمية</div>
        </div>
        
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.9] tracking-tighter mb-8 text-white">
          النظام الداخلي.
        </h1>
        
        <div className="text-gray-400 font-mono text-sm md:text-base max-w-3xl leading-relaxed pr-6 border-r-2 border-white/10 space-y-4">
          <p>
            يُشكل هذا النظام الداخلي الإطار التأسيسي والقانون الرسمي لاتحاد الدومينو العراقي.
          </p>
          <p>
            وهو يُحدّد تكوين الاتحاد، وولايته القانونية وتنظيمه الرسمي كهيئة اعتبارية سيادية تعمل بموجب قانون الاتحادات الرياضية الوطنية العراقية رقم (24) لسنة 2021.
          </p>
        </div>
      </header>

      {/* CONTENT SECTIONS */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 lg:px-24 py-20 flex flex-col gap-24">
        
        {/* PART I */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            الجزء الأول - التعاريف والأحكام العامة والالتزامات الأساسية
          </h2>
          
          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 1: التعاريف</h3>
              <ul className="space-y-3 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">1.1 الوزارة:</strong> وزارة الشباب والرياضة العراقية.</li>
                <li><strong className="text-white">1.2 اللجنة:</strong> اللجنة الأولمبية الوطنية العراقية.</li>
                <li><strong className="text-white">1.3 FID:</strong> الاتحاد الدولي للدومينو.</li>
                <li><strong className="text-white">1.4 CAS:</strong> محكمة التحكيم الرياضي في لوزان، سويسرا.</li>
                <li><strong className="text-white">1.5 الاتحاد:</strong> الاتحاد العراقي للدومينو.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 2: الاسم والوضع القانوني والمقر</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">2.1</strong> الاتحاد هو منظمة غير حكومية وغير ربحية تتمتع بشخصية أخلاقية مستقلة.</li>
                <li><strong className="text-white">2.2</strong> تأسس الاتحاد لمدة غير محدودة، وله صفة الشخصية الاعتبارية.</li>
                <li><strong className="text-white">2.3</strong> يقع المقر الرئيسي للاتحاد في بغداد، العراق. ويجوز فتح فروع أو مكاتب أو لجان تشغيلية في مناطق أو محافظات أخرى غير تابعة لأي اقليم، أو في أقضية حسب الحاجة وبموافقة الهيئة الإدارية.</li>
                <li><strong className="text-white">2.4</strong> يمتلك الاتحاد حقوقًا حصرية لاسمه باللغتين العربية والإنجليزية، وكذلك رموزه وشعاره وأي ترجمات رسمية، والتي يجب تسجيلها لدى مسجل الشركات لضمان حقوق الملكية الفكرية.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 3: اللغات الرسمية</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">3.1</strong> تعتبر اللغتان العربية والإنجليزية اللغتين الرسميتين للعمليات والتشريعات في الاتحاد. في حال وجود اختلاف أو نزاع قانوني بين النصين العربي والإنجليزي من هذا النظام الداخلي، يُعتدّ بالنص العربي المُسجّل لدى الوزارة واللجنة.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 4: المبادئ والالتزامات الحاكمة</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">4.1</strong> يعمل الاتحاد بطريقة لا تتعارض مع الدستور العراقي والقوانين السارية.</li>
                <li><strong className="text-white">4.2</strong> يلتزم الاتحاد التزامًا صارمًا بالميثاق الأولمبي، والدستور البارالمبي (حيثما ينطبق على أنواع معينة من الدومينو)، واللوائح والقواعد التي وضعتها FID.</li>
                <li><strong className="text-white">4.3</strong> يلتزم الاتحاد بالمدونة الدولية لمكافحة المنشطات والمدونة الدولية لأخلاقيات الرياضة التابعة للجنة الأولمبية الدولية.</li>
                <li><strong className="text-white">4.4</strong> يتعهد الاتحاد بالالتزام بمبادئ الحوكمة الرشيدة للمنظمات الرياضية وتنفيذ هذا النظام الداخلي.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART II */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            الجزء الثاني - المهمة والأهداف والوسائل
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 5: مهمة ودور الاتحاد</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">5.1</strong> تُعرف لعبة الدومينو بأنها لعبة فكرية وثقافية قديمة، تمثل مزيجًا من الرياضة والاحتمالات الرياضية والتفكير الاستراتيجي.</li>
                <li><strong className="text-white">5.2</strong> تتمثل المهمة الأساسية للاتحاد في نشر وتنظيم وتطوير لعبة الدومينو في جميع مناطق العراق، فضلاً عن رفع مستوى المعرفة الثقافية على أساس رياضي وعلمي وتعليمي.</li>
                <li><strong className="text-white">5.3</strong> يعمل الاتحاد كهيئة إدارية عليا وحيدة مسؤولة عن رياضة الدومينو، وبطولاتها الوطنية، والأحداث المصنفة رياضياً داخل جمهورية العراق.</li>
                <li><strong className="text-white">5.4</strong> يتولى الاتحاد الحقوق الحصرية لصياغة التصنيفات الرسمية، وخوارزميات التصنيف الرياضي، والتصريح بالمسابقات المعتمدة.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 6: الأهداف القانونية للاتحاد</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">6.1 الترويج:</strong> العمل على نشر لعبة الدومينو في جميع أنحاء العراق، وتسهيل وسائل ممارستها، ورفع مستواها، وإدارتها، وتنظيم أنشطتها، وحمايتها، والإعلان عنها.</li>
                <li><strong className="text-white">6.2 التمثيل:</strong> تمثيل العراق من خلال إعداد وتأهيل الفرق الوطنية للمشاركة في المسابقات العربية والإقليمية والقارية والدولية التي تقام داخل وخارج البلاد لتحقيق إنجازات رياضية عالية.</li>
                <li><strong className="text-white">6.3 التطوير:</strong> تأهيل الكوادر الفنية والإدارية ورفع مستواها للتنافس مع الدول المتقدمة.</li>
                <li><strong className="text-white">6.4 النزاهة:</strong> حظر استخدام المنشطات في مجال الرياضة كما هو منصوص عليه في المدونة الدولية لمكافحة المنشطات، بالتنسيق مع المنظمات المحلية والدولية.</li>
                <li><strong className="text-white">6.5 الثقافة:</strong> نشر الثقافة الرياضية، وزيادة الوعي بفوائدها في البلاد، ومنع أعمال الشغب داخل وخارج أماكن اللعب، ومنع أي شكل من أشكال التمييز العنصري، والاهتمام بالبيئة.</li>
                <li><strong className="text-white">6.6 الاستقلال المالي:</strong> تعظيم الموارد المالية للاتحاد من خلال الوسائل القانونية.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 7: وسائل تحقيق الأهداف</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">7.1 التنسيق:</strong> التنسيق والتعاون مع وزارة الشباب والرياضة والمنظمات المحلية والأجنبية.</li>
                <li><strong className="text-white">7.2 إدارة الفعاليات:</strong> تنظيم وإدارة الفعاليات الرياضية في جميع أنحاء العراق لضمان أوسع مشاركة ممكنة للرياضيين واختيار أفضل اللاعبين لتمثيل البلاد.</li>
                <li><strong className="text-white">7.3 التنظيم:</strong> وضع الأسس والمبادئ لتنظيم شؤون التدريب والتحكيم وعقود اللاعبين.</li>
                <li><strong className="text-white">7.4 التعليم:</strong> عقد دورات فنية وتدريبية وتحكيمية لتطوير كوادر الاتحاد.</li>
                <li><strong className="text-white">7.5 المنتخبات الوطنية:</strong> إعداد وتطوير وإدارة المنتخبات الرياضية الوطنية التي تمثل الدولة في المحافل الدولية وتوفير المتطلبات التشغيلية لتحقيق الأهداف المنشودة.</li>
                <li><strong className="text-white">7.6 التقدير:</strong> مكافأة الأبطال بما يتناسب مع إنجازاتهم، وكذلك أولئك الذين يُعتبر أنهم خدموا الرياضة وأهداف الاتحاد.</li>
                <li><strong className="text-white">7.7 الإدارة:</strong> إدارة شؤون اللعبة وتطوير مواردها من جميع الجوانب التقنية والمالية والتنظيمية.</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-8">
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 8: مبادئ الاتحاد ومكافحة التمييز</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">8.1</strong> الاتحاد تأسس ديمقراطياً ومستقل تماماً، ويستند أساساً على مبدأ المساواة في الحقوق بين أعضائه.</li>
                <li><strong className="text-white">8.2</strong> يرفض الاتحاد بشكل قاطع ويمنع منعاً باتاً أي شكل من أشكال التمييز العنصري ضد منطقة جغرافية أو شخص خاص أو مجموعة بسبب العرق أو لون البشرة أو الأصل العرقي أو القومي أو الاجتماعي أو العمر أو الثروة أو الإعاقة أو الدين أو الآراء السياسية.</li>
                <li><strong className="text-white">8.3</strong> يتخذ الاتحاد جميع التدابير اللازمة لضمان المساواة في الوصول إلى الرياضة والتأكد بشكل صارم من تمثيل العنصر النسائي داخل هيئات الاتحاد والهيئة العامة والإدارة.</li>
                <li><strong className="text-white">8.4</strong> يلتزم الاتحاد التزاماً صارماً بحماية البيانات الشخصية المتعلقة بجميع أصحاب المصلحة واللاعبين المسجلين لديه.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART III */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            الجزء الثالث - قواعد وشروط العضوية
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 9: الأعضاء والأندية المنتسبة</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">9.1</strong> تتألف الشركات الأعضاء المنتسبة في المقام الأول من نوادي رياضية عراقية مرخصة تمارس رياضة الدومينو (أو لعبة ضمنها).</li>
                <li><strong className="text-white">9.2</strong> يجوز للاتحاد أيضاً منح عضوية منتسبة للجمعيات الإقليمية أو الأماكن أو الفروع أو المنظمات المقابلة التي تحتفظ بالبنية التحتية التشغيلية للدومينو في مناطقها المعنية، شريطة أن تستوفي الشروط والضوابط المحددة في هذا النظام الداخلي.</li>
                <li><strong className="text-white">9.3</strong> يحق للأعضاء المنتسبين ممارسة جميع الامتيازات الناشئة عن قواعد الاتحاد، بما في ذلك الحق في تنظيم الأحداث المصنفة الرسمية والحق في تقديم مقترحات لإدراجها في جدول أعمال الهيئة العامة.</li>
                <li><strong className="text-white">9.4</strong> يجب على جميع الأعضاء الالتزام بجميع القواعد واللوائح والقرارات الخاصة بالاتحاد والتأكد من امتثال هيئاتهم التابعة ولاعبيهم لها بشكل كامل.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 10: إجراءات الانتساب</h3>
              <p className="font-mono text-sm text-gray-300 mb-4">10.1 يتم الانضمام إلى الاتحاد عن طريق تقديم طلب رسمي، والذي يجب أن يكون مصحوباً بالوثائق التالية:</p>
              <ul className="space-y-3 font-mono text-sm text-gray-300 list-none pr-4 border-r border-white/10">
                <li><strong className="text-white">10.1.1</strong> نسخة من شهادة الترخيص الرسمية للنادي أو المنظمة.</li>
                <li><strong className="text-white">10.1.2</strong> بيان رسمي عن المقر الرئيسي والمرافق وأماكن اللعب الخاصة.</li>
                <li><strong className="text-white">10.1.3</strong> أسماء أعضاء الهيئة الإدارية لمقدم الطلب.</li>
                <li><strong className="text-white">10.1.4</strong> دفع رسوم الانتساب الرسمية وفقاً للوائح الاتحاد.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 11: الموافقة على العضوية ورفضها وفقدانها</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">11.1</strong> لا تعتبر الأندية الرياضية أعضاء في الاتحاد قانونياً إلا بعد موافقة الهيئة العامة ومع ذلك، يجوز للهيئة الإدارية أن تسمح للنادي بالمشاركة في الأنشطة في انتظار هذه الموافقة.</li>
                <li><strong className="text-white">11.2</strong> في حال عدم الموافقة على الانتساب، يتعين على الاتحاد إصدار قرار مسبب يُبلغ به النادي عبر خطاب رسمي. ويجوز الاعتراض على هذا القرار لدى المركز الوطني لتسوية المنازعات الرياضية والتحكيم بعد استنفاد آليات الاعتراض الداخلية للاتحاد.</li>
                <li><strong className="text-white">11.3</strong> يحق لأي عضو منتسب تم إنهاء عضويته أن يستأنف أمام المركز الوطني لتسوية وتحكيم الرياضة في غضون أسبوعين من تاريخ إخطاره رسمياً بالقرار.</li>
                <li><strong className="text-white">11.4</strong> تتمتع الهيئة الإدارية بسلطة تعليق عضوية الأندية الأعضاء في حالة انتهاك القانون، في انتظار انعقاد اجتماع الهيئة العامة.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART IV */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            الجزء الرابع - التنظيم والأعضاء
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 12: الهيئة العامة</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">12.1</strong> الهيئة العامة هي أعلى سلطة تشريعية وعليا في الاتحاد.</li>
                <li><strong className="text-white">12.2 التكوين:</strong> تتألف الهيئة العامة من الأندية الأعضاء المشاركة في بطولات الاتحاد، مع الحفاظ على نسبة أغلبية صارمة. ويجب أن تضم أيضاً ممثلين منتخبين عن لاعبي ولاعبات المنتخب الوطني من سن 18 عاماً فما فوق، وممثلين منتخبين عن الحكام والمدربين المصنفين دولياً أو آسيويًا، وأعضاء عراقيين في الهيئات الدولية، مع ضمان تمثيل العنصر النسائي.</li>
                <li><strong className="text-white">12.3 الصلاحيات والواجبات:</strong> تمارس هذه الهيئة السلطة المطلقة للموافقة على النظام الداخلي للاتحاد وتعديله، ويشترط الحصول على أغلبية إلزامية تبلغ ثلثي الأصوات الصحيحة للأعضاء الحاضرين. كما توافق على السياسة العامة والميزانية السنوية والتقارير المالية والإدارية.</li>
                <li><strong className="text-white">12.4</strong> تعمل الهيئة العامة كهيئة استئناف داخلية نهائية للقرارات التي يتخذها الهيئة الإدارية أو الرئيس. ولها الحق الحصري في انتخاب أعضاء الهيئة الإدارية، وعزلهم، وتحديد العقوبات التأديبية.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 13: الهيئة الإدارية</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">13.1</strong> الهيئة الإدارية هو الهيئة الاستراتيجية والإدارية والإشرافية للاتحاد، ويمارس الوظائف التنفيذية والتشريعية بين دورات الهيئة العامة.</li>
                <li><strong className="text-white">13.2 مدة العضوية وشروطها:</strong> مدة العضوية أربع (4) سنوات تقويمية. يجوز للعضو الترشح لفترات متتالية، بشرط ألا تتجاوز فترتين متتاليتين أو ثلاث فترات غير متتالية، وألا يتجاوز عمره خمسة وسبعين (75) عاماً. يجب أن يكون المرشحون عراقيين، وأن يحملوا على الأقل شهادة تحضيرية، وأن يكونوا ممارسين أو خبراء ممنوعين منعاً باتاً من اللعب أو التحكيم رسمياً أثناء فترة عضويتهم.</li>
                <li><strong className="text-white">13.3 السلطة الاستراتيجية:</strong> يُقرّ الهيئة الإدارية اللوائح المتعلقة بالبطولات والتصنيفات وخوارزمية إيلو الرياضية. كما يُعدّ تقديرات الميزانية السنوية، وهو مسؤول عن توفير جميع المتطلبات اللازمة للمنتخبات الوطنية لتحقيق أعلى مستويات الإنجاز الرياضي.</li>
                <li><strong className="text-white">13.4 التعيينات الإدارية:</strong> يجب على الهيئة الإدارية التعاقد مع أمين مالي وأمين عام من خارج الهيئة العامة، بناءً على اقتراح الرئيس وموافقة الأغلبية ويحضرون الاجتماعات دون حق التصويت.</li>
                <li><strong className="text-white">13.5 حظر ازدواجية المناصب:</strong> لا يجوز الجمع بين عضوية الهيئة الإدارية للاتحاد وعضوية الهيئة الإدارية لأي اتحاد رياضي وطني آخر. ويتعين على أي عضو منتخب الاستقالة من أي منصب يتعارض مع هذا الحظر.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 14: رئيس الاتحاد</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">14.1</strong> يمثل الرئيس الاتحاد رسمياً في جميع المجالات القانونية والمالية والخارجية أمام الحكومة والقضاء وفي المحافل الدولية.</li>
                <li><strong className="text-white">14.2</strong> يتمتع الرئيس بصلاحية توقيع العقود والتقارير المالية وتفويضات الصرف والبرنامج السنوي. وبينما يجوز منح تفويضات تشغيلية صريحة للهيئة الإدارية، يترأس الرئيس جميع اجتماعات الهيئة العامة (باستثناء الاجتماعات الانتخابية) والهيئة الإدارية.</li>
                <li><strong className="text-white">14.3</strong> في حالة غياب الرئيس، يتصرف نائب الرئيس نيابة عنه.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART V */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            الجزء الخامس - الأخلاقيات والإجراءات التأديبية وتسوية النزاعات
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 15: لجنة الأخلاقيات</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">15.1</strong> لضمان النزاهة والالتزام بالمدونة الدولية لأخلاقيات الرياضة، تقوم الهيئة العامة بتشكيل لجنة أخلاقيات تتألف من ثلاثة أعضاء على الأقل وسبعة أعضاء على الأكثر، مع ضمان تمثيل الإناث.</li>
                <li><strong className="text-white">15.2</strong> تتولى هذه اللجنة محاسبة الأعضاء وفقاً لمدونة أخلاقية صاغها الهيئة الإدارية وصادقت عليها الهيئة العامة.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 16: التحكيم الداخلي والاستئناف</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">16.1</strong> يقوم الاتحاد بتشكيل لجنة تحكيم داخلية للنظر في النزاعات الرياضية التي تنشأ داخل الاتحاد وحلها.</li>
                <li><strong className="text-white">16.2</strong> يجب أولاً الطعن في أي قرار تتخذه هيئة تابعة للاتحاد فيما يتعلق بالمخالفات الفنية أو خوارزميات المنافسة أو الإجراءات التأديبية القياسية حصرياً عن طريق الاستئناف الداخلي إلى لجنة التحكيم الداخلية هذه، وفي النهاية، إلى الهيئة العامة.</li>
              </ul>
            </div>

            <div className="bg-red-900/10 border border-red-500/20 p-8">
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 17: التحكيم الوطني والدولي</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">17.1 المنازعات الداخلية والمؤسسية:</strong> يلتزم الاتحاد وأعضاؤه قانوناً بآليات وقرارات المركز الوطني للتسوية والتحكيم الرياضي في العراق. يجب توجيه المنازعات المتعلقة بإنهاء العضوية أو رفض الانتساب إلى هذا المركز الوطني في غضون أسبوعين (14 يوماً) من تاريخ الإخطار الرسمي، وذلك بعد استنفاد جميع سبل التظلم الداخلية المتاحة للاتحاد.</li>
                <li><strong className="text-white">17.2 النزاعات الدولية والتمثيلية:</strong> في الحالات المتعلقة بالتمثيل الدولي، أو النزاعات الفنية العابرة للحدود، أو توجيهات الاتحاد الدولي للعبة، يجوز تصعيد النزاعات إلى CAS. وستقوم CAS بحل النزاع بشكل نهائي وملزم وفقاً لقواعد التحكيم المتعلقة بالرياضة.</li>
                <li><strong className="text-white">17.3</strong> لا يجوز تقديم استئناف أمام CAS إلا بعد استنفاد جميع الإجراءات الداخلية للاتحاد وسبل الانتصاف الوطنية بالكامل. ويكون الموعد النهائي لتقديم أي استئناف خارجي أمام محكمة التحكيم الرياضي واحداً وعشرين (21) يوماً من تاريخ استلام المستأنف للقرار الداخلي النهائي.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART VI */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            الجزء السادس - الأحكام المالية والإدارة والشفافية
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 18: مصادر الإيرادات</h3>
              <p className="font-mono text-sm text-gray-300 mb-4">18.1 تتكون الموارد المالية للاتحاد مما يلي:</p>
              <ul className="space-y-3 font-mono text-sm text-gray-300 list-none pr-4 border-r border-white/10">
                <li><strong className="text-white">18.1.1</strong> رسوم الاشتراك من الأعضاء المنتسبين والإيرادات الناتجة عن المشاركة في مختلف الأحداث الرياضية والبطولات المصنفة رياضياً.</li>
                <li><strong className="text-white">18.1.2</strong> المنح الحكومية المخصصة ضمن الميزانية العامة للدولة، وكذلك المنح المقدمة من الشركات الراعية، أو من الاتحاد الدولي للرياضات الدولية والاتحادات القارية وفقاً للقانون.</li>
                <li><strong className="text-white">18.1.3</strong> التبرعات والهدايا والقروض القانونية.</li>
                <li><strong className="text-white">18.1.4</strong> الإيرادات المستمدة من الاستثمارات، والرعاية المؤسسية، ومبادرات التمويل الذاتي، وحقوق البث التلفزيوني والتسويق الرقمي أو الرياضي.</li>
                <li><strong className="text-white">18.1.5</strong> العوائد من الاستثمارات العقارية والإيجارات وحقوق البناء.</li>
                <li><strong className="text-white">18.1.6</strong> أي مصادر دخل أخرى مسموح بها قانوناً وتوافق عليها الهيئة العامة.</li>
              </ul>
              <p className="font-mono text-sm text-gray-300 mt-4">
                <strong className="text-white">18.2</strong> يحق للجهة المانحة وضع آليات لوصول منحها المالية إلى الاتحاد مباشرة من خلال حسابات الاتحاد الخاصة في البنوك الرسمية.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 19: العمليات المصرفية والمالية</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">19.1</strong> الاتحاد ملزم قانوناً بإيداع وسحب وتحويل أمواله النقدية باسمه فقط في أحد البنوك العراقية المعتمدة.</li>
                <li><strong className="text-white">19.2</strong> يجب على الهيئة الإدارية إخطار السلطات الحكومية المختصة رسمياً في غضون أسبوع واحد في حالة تغيير البنك المعتمد.</li>
                <li><strong className="text-white">19.3</strong> تبدأ السنة المالية للاتحاد في الأول من كانون الثاني / يناير من كل عام وتنتهي بشكل صارم في الحادي والثلاثين من كانون الأول / ديسمبر من نفس العام.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 20: التدقيق والرقابة المالية</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">20.1</strong> تخضع جميع حسابات الاتحاد وسجلاته المالية وعملياته بشكل صارم للتدقيق والإشراف من قبل المجلس الاتحادي الأعلى للمراجعة.</li>
                <li><strong className="text-white">20.2</strong> يقوم الهيئة الإدارية بتعيين مدقق حسابات مالي معتمد ومستقل لمراجعة تقديرات الميزانية السنوية والحسابات النهائية قبل عرضها الرسمي على الهيئة العامة.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 21: تعويضات أعضاء مجلس الإدارة</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">21.1</strong> لا يجوز للرئيس والأعضاء المنتخبين في الهيئة الإدارية أن يتقاضوا رواتب مقابل أداء واجباتهم.</li>
                <li><strong className="text-white">21.2</strong> تعتبر خدمتهم تطوعية تماماً؛ ومع ذلك، يحق لهم الحصول على تعويض عن السفر والإقامة والنفقات الأخرى المبررة التي يتكبدونها أثناء قيامهم بالمهام الرسمية الموكلة إليهم، كما هو محدد في اللوائح المالية للاتحاد.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART VII */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            الجزء السابع - الترخيص التشغيلي والحوكمة والحصرية
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 22: حصرية الاتحاد</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">22.1</strong> وفقاً لقانون الرياضة العراقي، لا يجوز وجود أكثر من اتحاد واحد يُشرف على لعبة أو رياضة الدومينو داخل جمهورية العراق. ويتمتع الاتحاد بالسلطة المحلية الوحيدة.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 23: الحضور الرقمي وشفافية الحوكمة الرشيدة</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">23.1</strong> الاتحاد ملزم قانوناً بالحفاظ على موقع إلكتروني رسمي على الشبكة الإلكترونية لنشر معلوماته ولوائحه وأنشطته للجمهور.</li>
                <li><strong className="text-white">23.2</strong> يجب على الاتحاد الاحتفاظ بعناوين بريد إلكتروني رسمية مستضافة ضمن نطاق الموقع الإلكتروني لجميع المراسلات الرسمية.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 24: ترخيص الأكاديميات والمدارس والأندية</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">24.1</strong> يضع الاتحاد الشروط والتعليمات والرسوم الإلزامية لمنح التراخيص لممارسة الرياضة في الأندية والمدارس والأكاديميات.</li>
                <li><strong className="text-white">24.2</strong> يحتفظ الاتحاد بالحق في إنشاء أكاديمياته ومراكز التدريب الخاصة به والمتخصصة في رياضة الدومينو، بالتنسيق مع الكيانات الحكومية وغير الحكومية.</li>
                <li><strong className="text-white">24.3</strong> تحتفظ الأندية الأعضاء بجميع حقوقها كأعضاء في الاتحاد في حالة تغيير كيانها القانوني إلى شركات تجارية.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART VIII */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            الجزء الثامن - الانتخابات والتعديلات والأحكام النهائية
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 25: العملية الانتخابية واللجنة</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">25.1</strong> يتم انتخاب أعضاء الهيئة الإدارية بالاقتراع السري المباشر من بين أعضاء الهيئة العامة.</li>
                <li><strong className="text-white">25.2</strong> لضمان الشفافية الديمقراطية المطلقة، تقوم الهيئة العامة بتشكيل لجنة انتخابية مستقلة من خارج أعضائها مباشرة بعد كل عملية انتخابية.</li>
                <li><strong className="text-white">25.3</strong> يجب أن يكون رئيس ونائب رئيس هذه اللجنة الانتخابية من المهنيين القانونيين المعترف بهم. وتتولى هذه اللجنة مسؤولية الإشراف على الانتخابات، والتصديق على نتائجها، وإعلانها.</li>
                <li><strong className="text-white">25.4</strong> يجب توجيه الدعوات الرسمية لحضور المؤتمر الانتخابي إلى الوزارة واللجنة وهيئة التنمية الدولية.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 26: التعديلات على النظام الداخلي</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">26.1</strong> لا يجوز تعديل هذا النظام الداخلي إلا من قبل الهيئة العامة.</li>
                <li><strong className="text-white">26.2</strong> يجب تقديم أي تعديل مقترح إلى الأمانة العامة قبل ثلاثين (30) يوماً على الأقل من اجتماع الهيئة العامة.</li>
                <li><strong className="text-white">26.3</strong> يتطلب التصديق على أي تعديل أغلبية مطلقة إلزامية تبلغ ثلثي (2/3) الأصوات الصحيحة للأعضاء الحاضرين. بعد التصديق، يُقدم النظام الداخلي المعدل إلى FID للاعتراف بها دولياً، وإلى السلطات العراقية المختصة.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">المادة 27: حل الاتحاد</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">27.1</strong> لا يجوز حل الاتحاد إلا بقرار خاص من الهيئة العامة المنعقدة خصيصاً لهذا الغرض.</li>
                <li><strong className="text-white">27.2</strong> يتطلب قرار حل الاتحاد أغلبية مطلقة من ثلاثة أرباع (3/4) من إجمالي الأعضاء المصوتين.</li>
                <li><strong className="text-white">27.3</strong> في حالة حل الاتحاد، وبعد تسوية جميع الالتزامات القانونية والمالية القائمة، يتم نقل الأصول المتبقية للاتحاد إلى اللجنة أو إلى مؤسسة رياضية خيرية معترف بها وفقاً لما تحدده الهيئة العامة، ولا يتم توزيعها بين الأعضاء.</li>
              </ul>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
