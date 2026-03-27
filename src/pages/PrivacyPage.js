import React, { useState, useEffect } from 'react';
import { Shield, ChevronRight, Mail, Info, Eye, Lock, UserCheck, AlertTriangle, FileText, Globe } from 'lucide-react';

const sections = [
  {
    id: "overview",
    title: "Genel Bakış",
    icon: <Info size={18} />,
    content: `LootMetric ("biz", "bizim" veya "bize") lootmetric.com adresini, oyun takibi ve istatistik platformu olarak işletmektedir. Bu Gizlilik Politikası, hizmetlerimizi kullandığınızda bilgilerinizinasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar. LootMetric'i kullanarak bu politikanın şartlarını kabul etmiş olursunuz.`
  },
  {
    id: "information",
    title: "Topladığımız Bilgiler",
    icon: <Eye size={18} />,
    items: [
      {
        heading: "Hesap Bilgileri",
        text: "Bir hesap kaydettiğinizde kullanıcı adınızı, e-posta adresinizi ve şifrenizi (şifrelenmiş halde) toplarız. İsteğe bağlı olarak ek profil bilgileri sağlayabilirsiniz."
      },
      {
        heading: "Oyun Verileri",
        text: "Gönderdiğiniz veya üçüncü taraf oyun platformlarından almamız için yetkilendirdiğiniz oyun istatistiklerini ve takip verilerini toplar ve görüntüleriz."
      },
      {
        heading: "Kullanım Verileri",
        text: "Sitemizle nasıl etkileşim kurduğunuz hakkında IP adresi, tarayıcı türü, ziyaret edilen sayfalar ve sayfalarda geçirilen süre dahil olmak üzere otomatik olarak bilgi toplarız."
      },
      {
        heading: "Çerezler (Cookies)",
        text: "Oturumunuzu sürdürmek, tercihlerinizi hatırlamak ve ilgili reklamları sunmak için çerezler ve benzer takip teknolojileri kullanırız."
      }
    ]
  },
  {
    id: "advertising",
    title: "Google AdSense & Reklamcılık",
    icon: <Globe size={18} />,
    content: `Sitemizde reklam göstermek için Google AdSense kullanıyoruz. Google, web sitemize ve İnternet'teki diğer sitelere yaptığınız önceki ziyaretlere dayanarak reklam sunmak için çerezleri ve web işaretçilerini kullanabilir. adssettings.google.com adresindeki Google Reklam Ayarları'nı ziyaret ederek kişiselleştirilmiş reklamcılıktan çıkabilirsiniz. Google'ın reklam hizmetlerini kullanan sitelerden gelen verileri nasıl kullandığı hakkında daha fazla bilgi için google.com/policies/privacy/partners adresini ziyaret edin.`
  },
  {
    id: "use",
    title: "Bilgilerinizi Nasıl Kullanıyoruz",
    icon: <UserCheck size={18} />,
    items: [
      { text: "Hesabınızı oluşturmak ve yönetmek için" },
      { text: "Oyun takip özelliklerimizi sağlamak ve geliştirmek için" },
      { text: "Hesapla ilgili bildirimleri ve güncellemeleri göndermek için" },
      { text: "Kullanım kalıplarını analiz etmek ve platformumuzu iyileştirmek için" },
      { text: "Google AdSense aracılığıyla ilgili reklamları görüntülemek için" },
      { text: "Yasal yükümlülüklere uymak için" }
    ]
  },
  {
    id: "sharing",
    title: "Veri Paylaşımı & Üçüncü Taraflar",
    icon: <Lock size={18} />,
    content: `Kişisel verilerinizi satmıyoruz. Bilgilerinizi, web sitemizi işletmemize yardımcı olan (barındırma, analiz ve reklam ortakları gibi) güvenilir üçüncü taraf hizmet sağlayıcılarla paylaşabiliriz. Bu sağlayıcılar, verilerinizi güvende tutmak ve yalnızca bize sağladıkları hizmetler için kullanmakla sözleşmeli olarak yükümlüdür. Ayrıca yasalar gerektiriyorsa veya haklarımızı korumak için bilgileri ifşa edebiliriz.`
  },
  {
    id: "security",
    title: "Veri Güvenliği",
    icon: <Shield size={18} />,
    content: `Kişisel bilgilerinizin yetkisiz erişime, değiştirilmesine, ifşasına veya imha edilmesine karşı korunması için endüstri standardı güvenlik önlemleri uyguluyoruz. Şifreler, güçlü kriptografik hashing kullanılarak saklanır. Ancak, İnternet üzerinden hiçbir iletim yöntemi %100 güvenli değildir ve mutlak güvenliği garanti edemeyiz.`
  },
  {
    id: "rights",
    title: "Haklarınız",
    icon: <FileText size={18} />,
    items: [
      { text: "Kişisel verilerinize erişme ve indirme" },
      { text: "Hesabınızdaki hatalı bilgileri düzeltme" },
      { text: "Hesabınızın ve ilişkili verilerinizin silinmesini talep etme" },
      { text: "İstediğiniz zaman pazarlama iletişimlerinden çıkma" },
      { text: "Google Reklam Ayarları üzerinden kişiselleştirilmiş reklamları devre dışı bırakma" }
    ]
  },
  {
    id: "children",
    title: "Çocukların Gizliliği",
    icon: <AlertTriangle size={18} />,
    content: `LootMetric 13 yaşın altındaki çocuklara yönelik değildir. 13 yaşın altındaki çocuklardan bilerek kişisel bilgi toplamıyoruz. Bir çocuğun bize kişisel veri sağladığına inanıyorsanız, lütfen bizimle iletişime geçin ve biz de bu verileri derhal silelim.`
  },
  {
    id: "contact",
    title: "İletişim",
    icon: <Mail size={18} />,
    content: `Bu Gizlilik Politikası veya verilerinizi nasıl işlediğimiz hakkında herhangi bir sorunuz varsa, lütfen şu adresten bizimle iletişime geçin: admin@lootmetric.com`
  }
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  return (
    <div className="flex-1 bg-gray-900 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Header Section */}
        <div className="mb-12 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-xs font-bold mb-4 uppercase tracking-wider">
            <Shield size={14} /> GÜVENLİK VE GİZLİLİK
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Gizlilik <span className="text-blue-500">Politikası</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
            Şeffaflığa inanıyoruz. LootMetric olarak verilerinizi tam olarak nasıl işlediğimizi, sizin için hazırladığımız net bilgilerle aşağıda bulabilirsiniz.
          </p>
          <div className="mt-4 text-xs text-gray-500 italic">
            Son Güncelleme: 27 Mart 2026
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Quick Links / Navigation */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-4 space-y-1 bg-gray-800/50 p-2 rounded-xl border border-gray-700/50">
              <p className="text-[10px] font-bold text-gray-500 px-3 py-2 uppercase tracking-widest">İçindekiler</p>
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-3 ${
                    activeSection === s.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  <span className={activeSection === s.id ? 'text-white' : 'text-gray-500'}>{s.icon}</span>
                  {s.title}
                </button>
              ))}
            </div>
          </aside>

          {/* Main Policy Content */}
          <div className="flex-1 space-y-6">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="bg-gray-800/40 border border-gray-800 rounded-2xl p-6 lg:p-8 scroll-mt-24 hover:border-gray-700/50 transition-colors group"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-blue-500 border border-gray-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all">
                    {section.icon}
                  </div>
                  <div>
                    <span className="text-blue-500/50 text-[10px] font-bold uppercase tracking-tighter">BÖLÜM 0{index + 1}</span>
                    <h2 className="text-xl font-bold text-white leading-none">{section.title}</h2>
                  </div>
                </div>

                {section.content && (
                  <p className="text-gray-400 leading-relaxed text-sm lg:text-base">
                    {section.content}
                  </p>
                )}

                {section.items && (
                  <div className="grid grid-cols-1 gap-3 mt-4">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800/50 hover:border-gray-700 transition-all">
                        <ChevronRight size={16} className="text-blue-500 shrink-0 mt-1" />
                        <div>
                          {item.heading && (
                            <h3 className="text-gray-200 font-bold text-sm mb-1">{item.heading}</h3>
                          )}
                          <p className="text-gray-400 text-xs lg:text-sm leading-relaxed">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}

            {/* Footer Contact */}
            <div className="mt-12 p-8 bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 rounded-2xl text-center">
              <Mail className="mx-auto text-blue-500 mb-4" size={32} />
              <h3 className="text-xl font-bold text-white mb-2">Sorularınız mı var?</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                Gizlilik politikamız hakkındaki tüm sorularınız için bizimle her zaman iletişime geçebilirsiniz.
              </p>
              <a 
                href="mailto:admin@lootmetric.com" 
                className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-blue-900/40"
              >
                admin@lootmetric.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
