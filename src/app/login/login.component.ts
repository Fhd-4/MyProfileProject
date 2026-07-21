import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class Login implements AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas') particleCanvas!: ElementRef<HTMLCanvasElement>;

  currentLang: 'en' | 'ar' = 'en';

  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private readonly apiUrl = 'https://localhost:44367/api/Auth/login';
  private ctx: CanvasRenderingContext2D | null = null;
  private animId: number = 0;
  private particles: Particle[] = [];
  private mouse = { x: -1000, y: -1000, radius: 180 };

  translations = {
    en: {
      backToCard: 'Back to Card',
      title: 'Admin Login',
      subtitle: 'Sign in to access the dashboard',
      emailPlaceholder: 'admin@example.com',
      passwordPlaceholder: '••••••••',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      emptyError: 'Please enter email and password!',
      invalidError: 'Invalid email or password!',
      notAdminError: 'Access Denied! Only Admin users can access this dashboard.',
      generalError: 'Login failed! Please check your credentials or server connection.',
      success: 'Admin login successful! Redirecting...'
    },
    ar: {
      backToCard: 'العودة للكرت',
      title: 'تسجيل دخول المسؤول',
      subtitle: 'قم بتسجيل الدخول للوصول إلى لوحة التحكم',
      emailPlaceholder: 'admin@example.com',
      passwordPlaceholder: '••••••••',
      signIn: 'تسجيل الدخول',
      signingIn: 'جاري تسجيل الدخول...',
      emptyError: 'يرجى إدخال البريد الإلكتروني وكلمة المرور!',
      invalidError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة!',
      notAdminError: 'عفواً، هذه اللوحة مخصصة للمدراء والمسؤولين (Admin) فقط!',
      generalError: 'حدث خطأ في عملية تسجيل الدخول، يرجى المحاولة لاحقاً.',
      success: 'تم تسجيل دخول الأدمن بنجاح! جاري التوجيه...'
    }
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get t() {
    return this.translations[this.currentLang];
  }

  get dir() {
    return this.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

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

  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.setAttribute('dir', this.currentLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', this.currentLang);
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = this.t.emptyError;
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Login API response:', response);

        const roles: string[] = response.user?.roles || response.roles || [];
        const isAdmin = roles.some(role =>
          role.toLowerCase().includes('admin') || role === 'Admin' || role === 'SuperAdmin'
        );

        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        if (response.userId || response.id) {
          localStorage.setItem('userId', response.userId || response.id);
        }
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }

        if (isAdmin || roles.length === 0) {
          // If user is Admin (or default fallback allow)
          this.successMessage = this.t.success;
          setTimeout(() => {
            this.router.navigate(['/admin']);
          }, 600);
        } else {
          // User is authenticated but NOT an Admin
          this.errorMessage = this.t.notAdminError;
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login error:', error);

        if (typeof error.error === 'string') {
          this.errorMessage = error.error;
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else if (error.status === 401) {
          this.errorMessage = this.t.invalidError;
        } else {
          this.errorMessage = this.t.generalError;
        }
      }
    });
  }

  private onGlobalMouseMove = (event: MouseEvent) => {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
  };

  private onGlobalMouseLeave = () => {
    this.mouse.x = -1000;
    this.mouse.y = -1000;
  };

  private initCanvas() {
    if (!this.particleCanvas) return;
    const canvas = this.particleCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.resizeCanvas();

    window.addEventListener('mousemove', this.onGlobalMouseMove);
    window.addEventListener('mouseleave', this.onGlobalMouseLeave);
    window.addEventListener('resize', this.resizeCanvas);

    const count = Math.min(95, Math.floor((canvas.width * canvas.height) / 12000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      this.particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2.2 + 1.2
      });
    }

    this.animate();
  }

  private resizeCanvas = () => {
    if (!this.particleCanvas || !isPlatformBrowser(this.platformId)) return;
    const canvas = this.particleCanvas.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  private animate = () => {
    if (!this.ctx || !this.particleCanvas || !isPlatformBrowser(this.platformId)) return;
    const canvas = this.particleCanvas.nativeElement;
    const width = canvas.width;
    const height = canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Mouse interactive magnetic repulsion / connection
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouse.radius && dist > 0) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        const pushX = (dx / dist) * force * 4.5;
        const pushY = (dy / dist) * force * 4.5;
        p.x -= pushX;
        p.y -= pushY;
      }

      // Smooth float movement
      p.x += p.vx;
      p.y += p.vy;

      // Screen edge bounces
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > width) { p.x = width; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > height) { p.y = height; p.vy *= -1; }

      // Draw particle dot
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(96, 165, 250, 0.85)';
      this.ctx.fill();

      // Connect particle to mouse if within interactive radius
      if (dist < 170) {
        const mouseOpacity = (1 - dist / 170) * 0.45;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.strokeStyle = `rgba(59, 130, 246, ${mouseOpacity})`;
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
      }

      // Connect nearby particles with constellation lines
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const distance = Math.hypot(p.x - p2.x, p.y - p2.y);

        if (distance < 145) {
          const lineOpacity = (1 - distance / 145) * 0.28;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(59, 130, 246, ${lineOpacity})`;
          this.ctx.lineWidth = 0.9;
          this.ctx.stroke();
        }
      }
    }

    this.animId = requestAnimationFrame(this.animate);
  };
}
