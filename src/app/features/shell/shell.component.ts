import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatToolbarModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly groupService = inject(GroupService);

  /** True when the viewport matches a handset (mobile) breakpoint. */
  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe(Breakpoints.Handset)
      .pipe(map(result => result.matches)),
    { initialValue: false },
  );

  /**
   * Updates the active group when the user selects a different one
   * from the group switcher in the navigation drawer.
   * @param groupId The ID of the newly selected group.
   */
  protected onGroupChange(groupId: string): void {
    this.groupService.setActiveGroup(groupId);
  }

  /**
   * Clears group state and signs the user out, navigating to the login page.
   */
  protected async signOut(): Promise<void> {
    this.groupService.resetGroups();
    await this.auth.signOut();
  }
}
