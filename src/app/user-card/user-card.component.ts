import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseX: number;
  baseY: number;
}

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.scss']
})
export class UserCardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') bgCanvas!: ElementRef<HTMLCanvasElement>;

  userData: any = null;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  
  currentLang: 'en' | 'ar' = 'en';
  showCardBackSide: boolean = false;

  private readonly getApiUrl = `${environment.apiUrl}/Profile/user/`;
  private ctx: CanvasRenderingContext2D | null = null;
  private animId: number = 0;
  private particles: Particle[] = [];
  private mouse = { x: -1000, y: -1000, radius: 180 };

  translations = {
    en: {
      aboutMe: 'About Me',
      skills: 'Skills',
      experience: 'Experience',
      education: 'Education',
      scanText: 'SCAN TO VIEW MY DIGITAL CARD',
      saveContact: 'Save Contact',
      loading: 'Loading Profile...',
      notFound: 'Profile not found or is inactive.'
    },
    ar: {
      aboutMe: 'نبذة عني',
      skills: 'المهارات',
      experience: 'الخبرة المهنية',
      education: 'التعليم',
      scanText: 'امسح الكود لعرض كرتي الرقمي',
      saveContact: 'حفظ جهة الاتصال',
      loading: 'جاري تحميل الملف الشخصي...',
      notFound: 'الملف الشخصي غير موجود أو غير نشط.'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Detect route parameter 'id'
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.fetchUserProfile(id);
      } else {
        this.isLoading = false;
        this.errorMessage = 'No user specified.';
      }
    });

    // Detect browser default language or fallback
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('lang');
      if (savedLang === 'ar' || savedLang === 'en') {
        this.currentLang = savedLang;
      }
    }
  }

  get t() {
    return this.translations[this.currentLang];
  }

  get dir() {
    return this.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  get userDisplayName(): string {
    if (!this.userData) return '';
    return this.currentLang === 'ar' 
      ? (this.userData.nameAr || this.userData.nameEn || this.userData.username || '') 
      : (this.userData.nameEn || this.userData.username || '');
  }

  fetchUserProfile(id: string) {
    this.isLoading = true;
    this.errorMessage = null;
    this.http.get<any>(`${this.getApiUrl}${id}`).subscribe({
      next: (data) => {
        this.isLoading = false;
        if (data) {
          this.userData = data;
        } else {
          this.errorMessage = this.currentLang === 'ar' ? this.translations.ar.notFound : this.translations.en.notFound;
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching user profile card:', err);
        this.errorMessage = this.currentLang === 'ar' ? this.translations.ar.notFound : this.translations.en.notFound;
      }
    });
  }

  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', this.currentLang);
      document.documentElement.setAttribute('dir', this.currentLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', this.currentLang);
    }
  }

  toggleCardSide(): void {
    this.showCardBackSide = !this.showCardBackSide;
    this.cdr.detectChanges();
  }

  getQrCodeUrl(user: any): string {
    if (!user) return '';
    const id = user.Id || user.id;
    if (!id) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fahd1.runasp.net';
    const cardUrl = `${origin}/user/${id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=090d16&bgcolor=ffffff&data=${encodeURIComponent(cardUrl)}`;
  }

  downloadVCard(user: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!user) return;
    const vcardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${user.nameEn || user.username || ''}`,
      `ORG:${user.companyEn || ''}`,
      `TITLE:${user.titleEn || ''}`,
      `TEL;TYPE=CELL:${user.phone || ''}`,
      `EMAIL;TYPE=PREF,INTERNET:${user.email || ''}`,
      `URL:${user.website || ''}`,
      `ADR;TYPE=WORK:;;${user.locationEn || ''};;;;`,
      'END:VCARD'
    ].join('\n');

    const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${user.nameEn || 'contact'}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  shareCard(user: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!user) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fahd1.runasp.net';
    const shareUrl = `${origin}/user/${user.id}`;

    if (navigator.share) {
      navigator.share({
        title: user.nameEn || 'Digital Card',
        text: `View digital card of ${user.nameEn || ''}`,
        url: shareUrl
      }).catch(err => console.log('Share error', err));
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert(this.currentLang === 'ar' ? 'تم نسخ رابط المشاركة للحافظة!' : 'Share link copied to clipboard!');
        });
      }
    }
  }

  // --- Particle Background Animations ---
  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initCanvas(), 50);
    }
  }

  ngOnDestroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('mousemove', this.onGlobalMouseMove);
      window.removeEventListener('mouseleave', this.onGlobalMouseLeave);
      window.removeEventListener('resize', this.resizeCanvas);
    }
  }

  private initCanvas() {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas) return;

    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('mousemove', this.onGlobalMouseMove);
    window.addEventListener('mouseleave', this.onGlobalMouseLeave);
    window.addEventListener('resize', this.resizeCanvas);

    this.initParticles();
    this.animate();
  }

  private onGlobalMouseMove = (e: MouseEvent) => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };

  private onGlobalMouseLeave = () => {
    this.mouse.x = -1000;
    this.mouse.y = -1000;
  };

  private resizeCanvas = () => {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.initParticles();
  };

  private initParticles() {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas) return;

    this.particles = [];
    const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 18000));
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        baseX: x,
        baseY: y
      });
    }
  }

  private animate = () => {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render particles
    this.ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
    this.particles.forEach((p) => {
      // Mouse interaction (push away)
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.mouse.radius) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        const angle = Math.atan2(dy, dx);
        p.x -= Math.cos(angle) * force * 2;
        p.y -= Math.sin(angle) * force * 2;
      }

      // Normal movement
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around bounds
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx!.fill();
    });

    // Draw links
    this.ctx.strokeStyle = 'rgba(96, 165, 250, 0.08)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    this.animId = requestAnimationFrame(this.animate);
  };
}
